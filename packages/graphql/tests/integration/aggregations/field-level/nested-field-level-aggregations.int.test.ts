/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { graphql } from "graphql";
import type { Driver, Session } from "neo4j-driver";
import { Neo4jGraphQL } from "../../../../src/classes";
import { UniqueType } from "../../../utils/graphql-types";
import Neo4jHelper from "../../neo4j";

describe("Nested Field Level Aggregations", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    let session: Session;
    let typeDefs: string;

    const typeMovie = new UniqueType("Movie");
    const typeActor = new UniqueType("Actor");

    let neoSchema: Neo4jGraphQL;

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();

        typeDefs = `
        type ${typeMovie.name} {
            title: String
            ${typeActor.plural}: [${typeActor.name}!]! @relationship(type: "ACTED_IN", direction: IN, properties:"ActedIn")
        }

        type ${typeActor.name} {
            name: String
            age: Int
            born: DateTime
            ${typeMovie.plural}: [${typeMovie.name}!]! @relationship(type: "ACTED_IN", direction: OUT, properties:"ActedIn")
        }

        type ActedIn @relationshipProperties {
            screentime: Int
            character: String
        }
        `;

        neoSchema = new Neo4jGraphQL({ typeDefs });
        session = await neo4j.getSession();
        await session.run(`
        CREATE (m:${typeMovie.name} { title: "Terminator"})<-[:ACTED_IN { screentime: 60, character: "Terminator" }]-(arnold:${typeActor.name} { name: "Arnold", age: 54, born: datetime('1980-07-02')})
        CREATE (m)<-[:ACTED_IN { screentime: 120, character: "Sarah" }]-(:${typeActor.name} {name: "Linda", age:37, born: datetime('2000-02-02')})
        CREATE (:${typeMovie.name} {title: "Total Recall"})<-[:ACTED_IN { screentime: 180, character: "Quaid" }]-(arnold)
        `);
    });

    afterAll(async () => {
        await session.close();
        await driver.close();
    });

    test("count actors in movies in actors", async () => {
        const query = `
        query Query {
          actors: ${typeActor.plural}(where: {name: "Arnold"}) {
            name
            movies: ${typeMovie.plural} {
              title
              actorAggregate: ${typeActor.plural}Aggregate {
                count
              }
            }
          }
        }
        `;

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues(),
        });
        expect(gqlResult.errors).toBeUndefined();
        const movies = (gqlResult.data as any)?.actors[0].movies;
        expect(movies).toHaveLength(2);
        expect(movies).toContainEqual({
            title: "Terminator",
            actorAggregate: { count: 2 },
        });
        expect(movies).toContainEqual({
            title: "Total Recall",
            actorAggregate: { count: 1 },
        });
    });
});
