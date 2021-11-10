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

import { Context } from "../../types";
import { CypherStatement, CypherParams } from "../types";
import { Node } from "../../classes";
import { serializeObject } from "../utils";
import { generateParameterKey } from "./utils";

export function buildNodeStatement({
    varName,
    node,
    context,
    parameters,
}: {
    varName: string;
    node?: Node;
    context: Context;
    parameters?: Record<string, any>;
}): CypherStatement {
    const labels = node ? node.getLabelString(context) : "";
    const [parametersQuery, parsedParameters] = parseNodeParameters(varName, parameters);

    const parameterQueryString = parametersQuery ? ` ${parametersQuery}` : "";

    return [`(${varName}${labels}${parameterQueryString})`, parsedParameters];
}

function parseNodeParameters(nodeVar: string, parameters: CypherParams | undefined): CypherStatement {
    if (!parameters) return ["", {}];

    const parameterKeyPreffix = `${nodeVar}_node`;

    const cypherParameters: CypherParams = {};
    const nodeParameters: Record<string, string> = {};

    for (const [key, value] of Object.entries(parameters)) {
        const paramKey = generateParameterKey(parameterKeyPreffix, key);
        cypherParameters[paramKey] = value;
        nodeParameters[key] = `$${paramKey}`;
    }

    return [serializeObject(nodeParameters), cypherParameters];
}
