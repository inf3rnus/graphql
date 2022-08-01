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

import { CypherASTNode } from "../../CypherASTNode";
import type { CypherEnvironment } from "../../Environment";
import type { WhereParams } from "../../CypherBuilder";

export class ValidatePredicate extends CypherASTNode {
    private predicate: WhereParams;
    private message: string | undefined;

    constructor(predicate: WhereParams, message?: string) {
        super();
        this.predicate = predicate;
        this.message = message;
    }

    public getCypher(env: CypherEnvironment): string {
        const predicateCypher = this.predicate.getCypher(env);
        const messageStr = this.message ? `, "${this.message}"` : "";
        // TODO: should add [0] as third parameter?

        // return `apoc.util.validatePredicate(${predicateCypher}), "${this.message}", [0])`;
        return `apoc.util.validatePredicate(${predicateCypher})${messageStr})`;
    }
}
