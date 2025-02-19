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
import { generate } from "randomstring";
import Neo4jHelper from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";
import { UniqueType } from "../../utils/graphql-types";
import { createBearerToken } from "../../utils/create-bearer-token";

/*
 * Auth rules are already tested in the auth tests,
 * this suite is needed only to test field-level rules where the unwind optimization behave differently.
 */

describe("unwind-create field-level auth rules", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    const secret = "secret";

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();
    });

    afterAll(async () => {
        await driver.close();
    });

    describe("bind", () => {
        test("should raise an error if a user is created with the id different from the JWT", async () => {
            const session = await neo4j.getSession();

            const User = new UniqueType("User");

            const typeDefs = `
                type ${User} {
                    id: ID
                }
                extend type ${User} {
                    id: ID @authorization(validate: [{ operations: [CREATE], where: { node: { id: "$jwt.sub" } } }])
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

            const id = generate({
                charset: "alphabetic",
            });

            const id2 = generate({
                charset: "alphabetic",
            });

            const query = `
            mutation($id: ID!, $id2: ID!) {
                ${User.operations.create}(input: [{ id: $id }, {id: $id2 }]) {
                    ${User.plural} {
                        id
                    }
                }
            }
            `;

            try {
                const token = createBearerToken("secret", { sub: id });

                const gqlResult = await graphql({
                    schema: await neoSchema.getSchema(),
                    source: query,
                    variableValues: { id, id2 },
                    contextValue: neo4j.getContextValues({ token }),
                });

                expect((gqlResult.errors as any[])[0].message).toBe("Forbidden");
            } finally {
                await session.close();
            }
        });

        test("should not raise an error if a user is created without id", async () => {
            const session = await neo4j.getSession();

            const User = new UniqueType("User");

            const typeDefs = `
            type ${User} {
                id: ID
                name: String
            }
            extend type ${User} {
                id: ID @authorization(validate: [{ operations: [CREATE], where: { node: { id: "$jwt.sub" } } }])
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

            const id = generate({
                charset: "alphabetic",
            });

            const name = generate({
                charset: "alphabetic",
            });

            const query = `
            mutation($id: ID!, $name: String!) {
                ${User.operations.create}(input: [{ id: $id }, { name: $name }]) {
                    ${User.plural} {
                        id
                    }
                }
            }
            `;

            try {
                const token = createBearerToken("secret", { sub: id });

                const gqlResult = await graphql({
                    schema: await neoSchema.getSchema(),
                    source: query,
                    variableValues: { id, name },
                    contextValue: neo4j.getContextValues({ token }),
                });

                expect(gqlResult.errors).toBeFalsy();
            } finally {
                await session.close();
            }
        });

        test("should not raise an error if a nested user is created without id", async () => {
            const session = await neo4j.getSession();

            const User = new UniqueType("User");
            const Post = new UniqueType("Post");

            const typeDefs = `
            type ${User} {
                id: ID
                name: String
            }
            type ${Post} {
                title: String
                creator: ${User} @relationship(type: "HAS_POST", direction: IN)
            }
            extend type ${User} {
                id: ID @authorization(validate: [{ operations: [CREATE], where: { node: { id: "$jwt.sub" } } }])
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

            const id = generate({
                charset: "alphabetic",
            });

            const name = generate({
                charset: "alphabetic",
            });

            const query = `
            mutation($id: ID!, $name: String!) {
                ${Post.operations.create}(input: [{
                    title: "one", 
                    creator: { create: { node: { id: $id } } }
                }, { 
                    title: "two", 
                    creator: { create: { node: { name: $name } } }
                }]) {
                    ${Post.plural} {
                        title 
                        creator {
                            id
                        }
                    }
                }
            }
            `;

            try {
                const token = createBearerToken("secret", { sub: id });

                const gqlResult = await graphql({
                    schema: await neoSchema.getSchema(),
                    source: query,
                    variableValues: { id, name },
                    contextValue: neo4j.getContextValues({ token }),
                });

                expect(gqlResult.errors).toBeFalsy();
            } finally {
                await session.close();
            }
        });
    });

    describe("role", () => {
        test("should raise an error if a user is created with a role different from the JWT", async () => {
            const session = await neo4j.getSession();
            const User = new UniqueType("User");

            const typeDefs = `
            type JWTPayload @jwt {
                roles: [String!]!
            }

            type ${User} {
                id: ID
                name: String
            }
            extend type ${User} {
                id: ID @authorization(validate: [{ operations: [CREATE], where: { jwt: { roles_INCLUDES: "admin" } } }])
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

            const id = generate({
                charset: "alphabetic",
            });

            const id2 = generate({
                charset: "alphabetic",
            });

            const query = `
            mutation($id: ID!, $id2: ID!) {
                ${User.operations.create}(input: [{ id: $id }, {id: $id2 }]) {
                    ${User.plural} {
                        id
                    }
                }
            }
            `;

            try {
                const token = createBearerToken("secret", { roles: ["user"] });

                const gqlResult = await graphql({
                    schema: await neoSchema.getSchema(),
                    source: query,
                    variableValues: { id, id2 },
                    contextValue: neo4j.getContextValues({ token }),
                });

                expect((gqlResult.errors as any[])[0].message).toBe("Forbidden");
            } finally {
                await session.close();
            }
        });

        test("should not raise an error if a user is created without id", async () => {
            const session = await neo4j.getSession();

            const User = new UniqueType("User");

            const typeDefs = `
            type JWTPayload @jwt {
                roles: [String!]!
            }

            type ${User} {
                id: ID
                name: String
            }
            extend type ${User} {
                id: ID @authorization(validate: [{ operations: [CREATE], where: { jwt: { roles_INCLUDES: "admin" } } }])
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

            const name = generate({
                charset: "alphabetic",
            });

            const query = `
            mutation($name: String!) {
                ${User.operations.create}(input: [{ name: $name }, { name: $name }]) {
                    ${User.plural} {
                        id
                    }
                }
            }
            `;

            try {
                const token = createBearerToken("secret", { roles: ["invalid-role"] });

                const gqlResult = await graphql({
                    schema: await neoSchema.getSchema(),
                    source: query,
                    variableValues: { name },
                    contextValue: neo4j.getContextValues({ token }),
                });

                expect(gqlResult.errors).toBeFalsy();
            } finally {
                await session.close();
            }
        });
    });
});
