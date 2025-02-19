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

import type { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { gql } from "graphql-tag";
import Neo4jHelper from "./neo4j";
import { Neo4jGraphQL } from "../../src/classes";
import { toGlobalId } from "../../src/utils/global-ids";
import { UniqueType } from "../utils/graphql-types";
import { createBearerToken } from "../utils/create-bearer-token";

describe("Global node resolution", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    const secret = "secret";

    const typeFilm = new UniqueType("Film");
    const typeUser = new UniqueType("User");

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();
    });

    afterAll(async () => {
        await driver.close();
    });

    test("returns the correct id after create mutation when the id is autogenerated", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `type ${typeFilm.name} {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            title: String!
        }`;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
        });

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
                  dbId
              }
            }
          }
        `;

        try {
            const mutationResult = (await graphql({
                schema: await neoSchema.getSchema(),
                source: create,
                variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
                contextValue: neo4j.getContextValues(),
            })) as {
                data: Record<string, { [key: string]: { id: string; dbId: string }[] }>;
                errors: any;
            };

            expect(mutationResult.errors).toBeUndefined();

            const createdMovie = mutationResult.data[typeFilm.operations.create]?.[typeFilm.plural]?.[0];

            const expectedId = toGlobalId({ typeName: typeFilm.name, field: "dbId", id: createdMovie?.dbId || "" });

            expect(createdMovie?.id).toEqual(expectedId);
        } finally {
            await session.close();
        }
    });
    test("returns the correct id after create mutation when the id is not autogenerated", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `type ${typeFilm.name} {
            title: ID! @relayId
        }`;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
        });

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
              }
            }
          }
        `;

        const expectedId = toGlobalId({ typeName: typeFilm.name, field: "title", id: "2001: A Space Odyssey" });

        try {
            const mutationResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: create,
                variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
                contextValue: neo4j.getContextValues(),
            });

            expect(mutationResult.errors).toBeUndefined();

            const createdMovie = (mutationResult as { data: { [key: string]: Record<string, any> } }).data[
                typeFilm.operations.create
            ]?.[typeFilm.plural][0];
            expect(createdMovie).toEqual({ id: expectedId });
        } finally {
            await session.close();
        }
    });
    test("returns the correct id when queried", async () => {
        const session = await neo4j.getSession();
        const typeDefs = `type ${typeFilm.name} {
            title: ID! @relayId
        }`;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
        });

        const query = `query {
            ${typeFilm.plural} {
                id
              }
            }`;

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
              }
            }
          }
        `;

        const expectedId = toGlobalId({
            typeName: typeFilm.name,
            field: "title",
            id: "2001: A Space Odyssey",
        });

        try {
            await graphql({
                schema: await neoSchema.getSchema(),
                source: create,
                variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
                contextValue: neo4j.getContextValues(),
            });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            expect(gqlResult.errors).toBeUndefined();

            const movie = (gqlResult as { data: { [key: string]: Record<string, any>[] } }).data[typeFilm.plural]?.[0];
            expect(movie).toEqual({ id: expectedId });
        } finally {
            await session.close();
        }
    });
    test("return the correct id when the underlying field is an aliased id db property", async () => {
        const typeDefs = gql`
        type ${typeFilm.name} {
          dbId: ID! @relayId @alias(property: "id")
          title: String!
          createdBy: ${typeUser.name}! @relationship(type: "CREATED_BY", direction: OUT)
        }

        type ${typeUser.name} {
          dbId: ID! @relayId @alias(property: "id")
          name: String!
          createdFilms: [${typeFilm.name}!]! @relationship(type: "CREATED_BY", direction: IN)
        }
      `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        const mutation = `
        mutation($input : [${typeUser.name}CreateInput!]!) {
          ${typeUser.operations.create} (input: $input) {
            ${typeUser.plural} {
              id
              dbId
              createdFilmsConnection {
                totalCount
                edges {
                  cursor
                  node {
                    id
                    dbId
                    title
                  }
                }
              }
            }
          }
        }
      `;

        const result = await graphql({
            schema: await neoSchema.getSchema(),
            variableValues: {
                input: [
                    {
                        dbId: 1234567,
                        name: "Johnny Appleseed",
                        createdFilms: {
                            create: [{ node: { dbId: 223454, title: "The Matrix 2: Timelord Boogaloo" } }],
                        },
                    },
                ],
            },
            contextValue: neo4j.getContextValues(),
            source: mutation,
        });

        expect(result.errors).toBeUndefined();

        const user = (result.data as any)[typeUser.operations.create][typeUser.plural][0];

        expect(user.dbId).toBe("1234567");
        expect(user.id).toBe(toGlobalId({ typeName: typeUser.name, field: "dbId", id: 1234567 }));

        expect(user.createdFilmsConnection).toEqual({
            totalCount: 1,
            edges: [
                {
                    cursor: expect.any(String),
                    node: {
                        dbId: "223454",
                        id: toGlobalId({
                            typeName: typeFilm.name,
                            field: "dbId",
                            id: "223454",
                        }),
                        title: "The Matrix 2: Timelord Boogaloo",
                    },
                },
            ],
        });
    });
    test("return the correct id when the underlying field is of type Int", async () => {
        const typeDefs = gql`
        type ${typeFilm.name} {
          dbId: Int! @relayId @alias(property: "id")
          title: String!
          createdBy: ${typeUser.name}! @relationship(type: "CREATED_BY", direction: OUT)
        }

        type ${typeUser.name} {
          dbId: Int! @relayId @alias(property: "id")
          name: String!
          createdFilms: [${typeFilm.name}!]! @relationship(type: "CREATED_BY", direction: IN)
        }
      `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        const mutation = `
        mutation($input : [${typeUser.name}CreateInput!]!) {
          ${typeUser.operations.create} (input: $input) {
            ${typeUser.plural} {
              id
              dbId
              createdFilmsConnection {
                totalCount
                edges {
                  cursor
                  node {
                    id
                    dbId
                    title
                  }
                }
              }
            }
          }
        }
      `;

        const result = await graphql({
            schema: await neoSchema.getSchema(),
            variableValues: {
                input: [
                    {
                        dbId: 1234567,
                        name: "Johnny Appleseed",
                        createdFilms: {
                            create: [{ node: { dbId: 223454, title: "The Matrix 2: Timelord Boogaloo" } }],
                        },
                    },
                ],
            },
            contextValue: neo4j.getContextValues(),
            source: mutation,
        });

        expect(result.errors).toBeUndefined();

        const user = (result.data as any)[typeUser.operations.create][typeUser.plural][0];

        expect(user.dbId).toBe(1234567);
        expect(user.id).toBe(toGlobalId({ typeName: typeUser.name, field: "dbId", id: 1234567 }));

        expect(user.createdFilmsConnection).toEqual({
            totalCount: 1,
            edges: [
                {
                    cursor: expect.any(String),
                    node: {
                        dbId: 223454,
                        id: toGlobalId({
                            typeName: typeFilm.name,
                            field: "dbId",
                            id: 223454,
                        }),
                        title: "The Matrix 2: Timelord Boogaloo",
                    },
                },
            ],
        });
    });
    test("sends and returns the correct selectionSet for the node", async () => {
        const typeDefs = `
        type ${typeFilm.name} {
          title: ID! @relayId
          website: String
        }

        type FilmActor {
          name: ID! @relayId
          hairColor: String
        }
      `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        const query = `
          query($id: ID!) {
            node(id: $id) {
              id
              ... on ${typeFilm.name} {
                title
                website
              }
              ... on FilmActor {
                name
                hairColor
              }
            }
          }
        `;

        const film = {
            id: toGlobalId({ typeName: typeFilm.name, field: "title", id: "The Matrix 2022" }),
            title: "The Matrix 2022",
            website: "http://whatisthematrix.com",
        };

        await graphql({
            schema: await neoSchema.getSchema(),
            variableValues: { input: [{ title: film.title, website: film.website }] },
            contextValue: neo4j.getContextValues(),
            source: `
                  mutation($input: [${typeFilm.name}CreateInput!]!) {
                    ${typeFilm.operations.create}(input: $input) {
                      ${typeFilm.plural} {
                          id
                      }
                    }
                  }
                `,
        });
        const actor = {
            id: toGlobalId({ typeName: `FilmActor`, field: "name", id: "Keanu Reeves" }),
            name: "Keanu Reeves",
            hairColor: "BLACK",
        };

        await graphql({
            schema: await neoSchema.getSchema(),
            variableValues: { input: [{ name: actor.name, hairColor: actor.hairColor }] },
            contextValue: neo4j.getContextValues(),
            source: `
                  mutation($input: [FilmActorCreateInput!]!) {
                    createFilmActors(input: $input) {
                      filmActors {
                          id
                      }
                    }
                  }
                `,
        });

        const filmQueryResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues(),
            variableValues: { id: film.id },
        });

        expect(filmQueryResult.errors).toBeUndefined();

        const filmResult = (filmQueryResult as { data: { [key: string]: any } }).data.node;
        expect(filmResult).toEqual(film);

        const actorQueryResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues(),
            variableValues: { id: actor.id },
        });

        expect(actorQueryResult.errors).toBeUndefined();

        const actorResult = (actorQueryResult as { data: { [key: string]: any } }).data.node;
        expect(actorResult).toEqual(actor);
    });
    test("it should throw forbidden when incorrect allow on a top-level node query", async () => {
        const session = await neo4j.getSession();

        const typeDefs = `
          type ${typeUser.name} {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            name: String!
            created: [${typeFilm.name}!]! @relationship(type: "CREATED", direction: OUT)
          }

          type ${typeFilm.name} {
            title: ID! @relayId
            creator: ${typeUser.name}! @relationship(type: "CREATED", direction: IN)
          }

          extend type ${typeFilm.name} @authorization(validate: [{ when: [BEFORE], where: { node: { creator: { dbId: "$jwt.sub" } } } }])
        `;

        const query = `
          query ($id: ID!) {
            node(id: $id) {
              id
              ...on ${typeFilm.name} {
                title
              }
              ...on ${typeUser.name} {
                name
              }
            }
          }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        try {
            const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" })-[:CREATED]->(film:${typeFilm.name} { title: randomUUID() }) RETURN this { id: this.dbId, film: film }`;
            const { records } = await session.run(mutation);

            const record = records[0]?.toObject();
            // const dbId = record.this.dbId;
            const filmTitle = record?.this.film.properties.title;

            const token = createBearerToken(secret, { sub: "invalid" });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues({ token }),
                variableValues: { id: toGlobalId({ typeName: typeFilm.name, field: "title", id: filmTitle }) },
            });

            expect((gqlResult.errors as any[])[0].message).toBe("Forbidden");
        } finally {
            await session.close();
        }
    });
    test("should permit access when using a correct allow auth param", async () => {
        const session = await neo4j.getSession();
        const typeDefs = `

          type ${typeUser.name} {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            name: String!
          }

          extend type ${typeUser.name} @authorization(validate: [{ when: [BEFORE], where: { node: { dbId: "$jwt.sub" } } }])
      `;

        const query = `
        query ($id: ID!) {
          node(id: $id) {
            id
            ...on ${typeUser.name} {
              dbId
            }
          }
        }
    `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });
        try {
            const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" }) RETURN this`;
            const { records } = await session.run(mutation);

            const record = records[0]?.toObject();

            const userId = record?.this.properties.id;
            const relayId = toGlobalId({ typeName: typeUser.name, field: "dbId", id: userId });

            const token = createBearerToken(secret, { sub: userId });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues({ token }),
                variableValues: { id: relayId },
            });

            expect(gqlResult.errors).toBeUndefined();

            expect(gqlResult.data?.node).toEqual({ id: relayId, dbId: userId });
        } finally {
            await session.close();
        }
    });
    test("should permit access when using a correct allow auth param in an OR statement", async () => {
        const session = await neo4j.getSession();
        const typeDefs = `

        type JWTPayload @jwt {
          roles: [String!]!
        }

        type ${typeUser.name} {
          dbId: ID! @id @unique @relayId @alias(property: "id")
          name: String!
        }

        extend type ${typeUser.name} @authorization(validate: [{ when: [BEFORE], where: { OR: [{ jwt: { roles_INCLUDES: "admin" } }, { node: { dbId: "$jwt.sub" } }] } }])
    `;

        const query = `
      query ($id: ID!) {
        node(id: $id) {
          id
          ...on ${typeUser.name} {
            dbId
          }
        }
      }
  `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });
        try {
            const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" }) RETURN this`;
            const { records } = await session.run(mutation);

            const record = records[0]?.toObject();

            const userId = record?.this.properties.id;
            const relayId = toGlobalId({ typeName: typeUser.name, field: "dbId", id: userId });

            const token = createBearerToken(secret, { sub: userId });

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues({ token }),
                variableValues: { id: relayId },
            });

            expect(gqlResult.errors).toBeUndefined();

            expect(gqlResult.data?.node).toEqual({ id: relayId, dbId: userId });
        } finally {
            await session.close();
        }
    });
});
