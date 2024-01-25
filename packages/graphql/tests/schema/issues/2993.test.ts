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

import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { gql } from "graphql-tag";
import { lexicographicSortSchema } from "graphql/utilities";
import { Neo4jGraphQL } from "../../../src";

describe("https://github.com/neo4j/graphql/issues/2993", () => {
    test("should generate schema with only autogenerated properties on relationship", async () => {
        const typeDefs = gql`
            interface Profile {
                id: ID!
                userName: String!
            }

            type User implements Profile {
                id: ID! @id
                userName: String!
                following: [Profile!]! @relationship(type: "FOLLOWS", direction: OUT, properties: "FOLLOWS")
            }

            type FOLLOWS @relationshipProperties {
                since: DateTime! @timestamp(operations: [CREATE])
            }
        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });
        const printedSchema = printSchemaWithDirectives(lexicographicSortSchema(await neoSchema.getSchema()));

        expect(printedSchema).toMatchInlineSnapshot(`
            "schema {
              query: Query
              mutation: Mutation
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created during a create mutation
            \\"\\"\\"
            type CreateInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            type CreateUsersMutationResponse {
              info: CreateInfo!
              users: [User!]!
            }

            \\"\\"\\"A date and time, represented as an ISO-8601 string\\"\\"\\"
            scalar DateTime

            type DateTimeAggregateSelectionNonNullable {
              max: DateTime!
              min: DateTime!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            \\"\\"\\"
            The edge properties for the following fields:
            * User.following
            \\"\\"\\"
            type FOLLOWS {
              since: DateTime!
            }

            input FOLLOWSSort {
              since: SortDirection
            }

            input FOLLOWSUpdateInput {
              since: DateTime
            }

            input FOLLOWSWhere {
              AND: [FOLLOWSWhere!]
              NOT: FOLLOWSWhere
              OR: [FOLLOWSWhere!]
              since: DateTime
              since_GT: DateTime
              since_GTE: DateTime
              since_IN: [DateTime!]
              since_LT: DateTime
              since_LTE: DateTime
              since_NOT: DateTime @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              since_NOT_IN: [DateTime!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
            }

            type IDAggregateSelectionNonNullable {
              longest: ID!
              shortest: ID!
            }

            type Mutation {
              createUsers(input: [UserCreateInput!]!): CreateUsersMutationResponse!
              deleteUsers(delete: UserDeleteInput, where: UserWhere): DeleteInfo!
              updateUsers(connect: UserConnectInput, create: UserRelationInput, delete: UserDeleteInput, disconnect: UserDisconnectInput, update: UserUpdateInput, where: UserWhere): UpdateUsersMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            interface Profile {
              id: ID!
              userName: String!
            }

            type ProfileAggregateSelection {
              count: Int!
              id: IDAggregateSelectionNonNullable!
              userName: StringAggregateSelectionNonNullable!
            }

            input ProfileConnectInput {
              _on: ProfileImplementationsConnectInput
            }

            input ProfileConnectWhere {
              node: ProfileWhere!
            }

            input ProfileCreateInput {
              User: UserCreateInput
            }

            input ProfileDeleteInput {
              _on: ProfileImplementationsDeleteInput
            }

            input ProfileDisconnectInput {
              _on: ProfileImplementationsDisconnectInput
            }

            enum ProfileImplementation {
              User
            }

            input ProfileImplementationsConnectInput {
              User: [UserConnectInput!]
            }

            input ProfileImplementationsDeleteInput {
              User: [UserDeleteInput!]
            }

            input ProfileImplementationsDisconnectInput {
              User: [UserDisconnectInput!]
            }

            input ProfileImplementationsUpdateInput {
              User: UserUpdateInput
            }

            input ProfileOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more ProfileSort objects to sort Profiles by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [ProfileSort]
            }

            \\"\\"\\"
            Fields to sort Profiles by. The order in which sorts are applied is not guaranteed when specifying many fields in one ProfileSort object.
            \\"\\"\\"
            input ProfileSort {
              id: SortDirection
              userName: SortDirection
            }

            input ProfileUpdateInput {
              _on: ProfileImplementationsUpdateInput
              id: ID
              userName: String
            }

            input ProfileWhere {
              AND: [ProfileWhere!]
              NOT: ProfileWhere
              OR: [ProfileWhere!]
              id: ID
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_IN: [ID!]
              id_NOT: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_CONTAINS: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_ENDS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_IN: [ID!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_STARTS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_STARTS_WITH: ID
              typename_IN: [ProfileImplementation!]
              userName: String
              userName_CONTAINS: String
              userName_ENDS_WITH: String
              userName_IN: [String!]
              userName_NOT: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_CONTAINS: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_ENDS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_IN: [String!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_STARTS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_STARTS_WITH: String
            }

            type Query {
              profiles(options: ProfileOptions, where: ProfileWhere): [Profile!]!
              profilesAggregate(where: ProfileWhere): ProfileAggregateSelection!
              users(options: UserOptions, where: UserWhere): [User!]!
              usersAggregate(where: UserWhere): UserAggregateSelection!
              usersConnection(after: String, first: Int, sort: [UserSort], where: UserWhere): UsersConnection!
            }

            \\"\\"\\"An enum for sorting in either ascending or descending order.\\"\\"\\"
            enum SortDirection {
              \\"\\"\\"Sort by field values in ascending order.\\"\\"\\"
              ASC
              \\"\\"\\"Sort by field values in descending order.\\"\\"\\"
              DESC
            }

            type StringAggregateSelectionNonNullable {
              longest: String!
              shortest: String!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created and deleted during an update mutation
            \\"\\"\\"
            type UpdateInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesCreated: Int!
              nodesDeleted: Int!
              relationshipsCreated: Int!
              relationshipsDeleted: Int!
            }

            type UpdateUsersMutationResponse {
              info: UpdateInfo!
              users: [User!]!
            }

            type User implements Profile {
              following(directed: Boolean = true, options: ProfileOptions, where: ProfileWhere): [Profile!]!
              followingAggregate(directed: Boolean = true, where: ProfileWhere): UserProfileFollowingAggregationSelection
              followingConnection(after: String, directed: Boolean = true, first: Int, sort: [UserFollowingConnectionSort!], where: UserFollowingConnectionWhere): UserFollowingConnection!
              id: ID!
              userName: String!
            }

            type UserAggregateSelection {
              count: Int!
              id: IDAggregateSelectionNonNullable!
              userName: StringAggregateSelectionNonNullable!
            }

            input UserConnectInput {
              following: [UserFollowingConnectFieldInput!]
            }

            input UserCreateInput {
              following: UserFollowingFieldInput
              userName: String!
            }

            input UserDeleteInput {
              following: [UserFollowingDeleteFieldInput!]
            }

            input UserDisconnectInput {
              following: [UserFollowingDisconnectFieldInput!]
            }

            type UserEdge {
              cursor: String!
              node: User!
            }

            input UserFollowingConnectFieldInput {
              connect: ProfileConnectInput
              where: ProfileConnectWhere
            }

            type UserFollowingConnection {
              edges: [UserFollowingRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input UserFollowingConnectionSort {
              edge: FOLLOWSSort
              node: ProfileSort
            }

            input UserFollowingConnectionWhere {
              AND: [UserFollowingConnectionWhere!]
              NOT: UserFollowingConnectionWhere
              OR: [UserFollowingConnectionWhere!]
              edge: FOLLOWSWhere
              edge_NOT: FOLLOWSWhere @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              node: ProfileWhere
              node_NOT: ProfileWhere @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
            }

            input UserFollowingCreateFieldInput {
              node: ProfileCreateInput!
            }

            input UserFollowingDeleteFieldInput {
              delete: ProfileDeleteInput
              where: UserFollowingConnectionWhere
            }

            input UserFollowingDisconnectFieldInput {
              disconnect: ProfileDisconnectInput
              where: UserFollowingConnectionWhere
            }

            input UserFollowingFieldInput {
              connect: [UserFollowingConnectFieldInput!]
              create: [UserFollowingCreateFieldInput!]
            }

            type UserFollowingRelationship {
              cursor: String!
              node: Profile!
              properties: FOLLOWS!
            }

            input UserFollowingUpdateConnectionInput {
              edge: FOLLOWSUpdateInput
              node: ProfileUpdateInput
            }

            input UserFollowingUpdateFieldInput {
              connect: [UserFollowingConnectFieldInput!]
              create: [UserFollowingCreateFieldInput!]
              delete: [UserFollowingDeleteFieldInput!]
              disconnect: [UserFollowingDisconnectFieldInput!]
              update: UserFollowingUpdateConnectionInput
              where: UserFollowingConnectionWhere
            }

            input UserOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more UserSort objects to sort Users by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [UserSort!]
            }

            type UserProfileFollowingAggregationSelection {
              count: Int!
              edge: UserProfileFollowingEdgeAggregateSelection
              node: UserProfileFollowingNodeAggregateSelection
            }

            type UserProfileFollowingEdgeAggregateSelection {
              since: DateTimeAggregateSelectionNonNullable!
            }

            type UserProfileFollowingNodeAggregateSelection {
              id: IDAggregateSelectionNonNullable!
              userName: StringAggregateSelectionNonNullable!
            }

            input UserRelationInput {
              following: [UserFollowingCreateFieldInput!]
            }

            \\"\\"\\"
            Fields to sort Users by. The order in which sorts are applied is not guaranteed when specifying many fields in one UserSort object.
            \\"\\"\\"
            input UserSort {
              id: SortDirection
              userName: SortDirection
            }

            input UserUpdateInput {
              following: [UserFollowingUpdateFieldInput!]
              userName: String
            }

            input UserWhere {
              AND: [UserWhere!]
              NOT: UserWhere
              OR: [UserWhere!]
              followingConnection: UserFollowingConnectionWhere @deprecated(reason: \\"Use \`followingConnection_SOME\` instead.\\")
              \\"\\"\\"
              Return Users where all of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_ALL: UserFollowingConnectionWhere
              \\"\\"\\"
              Return Users where none of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_NONE: UserFollowingConnectionWhere
              followingConnection_NOT: UserFollowingConnectionWhere @deprecated(reason: \\"Use \`followingConnection_NONE\` instead.\\")
              \\"\\"\\"
              Return Users where one of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_SINGLE: UserFollowingConnectionWhere
              \\"\\"\\"
              Return Users where some of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_SOME: UserFollowingConnectionWhere
              id: ID
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_IN: [ID!]
              id_NOT: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_CONTAINS: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_ENDS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_IN: [ID!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_STARTS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_STARTS_WITH: ID
              userName: String
              userName_CONTAINS: String
              userName_ENDS_WITH: String
              userName_IN: [String!]
              userName_NOT: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_CONTAINS: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_ENDS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_IN: [String!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_NOT_STARTS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              userName_STARTS_WITH: String
            }

            type UsersConnection {
              edges: [UserEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }"
        `);
    });
});
