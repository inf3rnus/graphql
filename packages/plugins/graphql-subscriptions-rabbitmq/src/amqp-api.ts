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

import amqp from "amqplib";

export type ConnectionOptions = amqp.Options.Connect | string;
export type AmqpConnection = amqp.Connection;

type AmqpApiOptions = {
    exchange: string;
};

export class AmqpApi<T> {
    private channel: amqp.Channel | undefined;

    private exchange: string;

    constructor({ exchange }: AmqpApiOptions) {
        this.exchange = exchange || "neo4j-graphql";
    }

    public async connect(
        connectionOptions: ConnectionOptions,
        cb: (msg: T) => void | Promise<void>
    ): Promise<AmqpConnection> {
        const connection = await amqp.connect(connectionOptions);
        this.channel = await connection.createChannel();
        await this.channel.assertExchange(this.exchange, "fanout", { durable: false });
        const queue = await this.channel.assertQueue("", { exclusive: true }); // Creates queue with unique name

        const queueName = queue.queue;
        this.channel.bindQueue(queueName, this.exchange, ""); // binds exchange and queue

        await this.channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const messageBody = JSON.parse(msg.content.toString()) as T;
                await cb(messageBody);
                this.channel?.ack(msg);
            }
        });
        return connection;
    }

    public async publish(message: T): Promise<void> {
        if (!this.channel) throw new Error("AMQP Channel does not exists");
        const serializedMessage = JSON.stringify(message);
        this.channel.publish(this.exchange, "", Buffer.from(serializedMessage));
    }

    public async close(): Promise<void> {
        await this.channel?.close();
    }
}
