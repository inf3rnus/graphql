import { Relationship } from "../classes";
import { BaseField, DateTimeField, PrimitiveField } from "../types";

/*
    TODO - lets reuse this function for setting either node or rel properties.
           This was not reused due to the large differences between node fields
           - and relationship fields.
*/
function createSetRelationshipProperties({
    properties,
    varName,
    relationship,
    operation,
    parameterPrefix,
}: {
    properties: Record<string, unknown>;
    varName: string;
    relationship: Relationship;
    operation: "CREATE" | "UPDATE";
    parameterPrefix: string;
}): string {
    const strs: string[] = [];

    Object.entries(properties).forEach(([key]) => {
        const paramName = `${parameterPrefix}.${key}`;
        const field = (relationship.fields.find((x) => x.fieldName === key) as unknown) as BaseField;

        if ("timestamps" in field) {
            const f = field as DateTimeField;
            (f.timestamps || []).forEach((ts) => {
                if (ts.includes(operation)) {
                    strs.push(`SET ${varName}.${f.fieldName} = datetime()`);
                }
            });

            return;
        }

        if ("autogenerate" in field) {
            const f = field as PrimitiveField;

            strs.push(`SET ${varName}.${f.fieldName} = randomUUID()`);

            return;
        }

        if (["Point", "CartesianPoint"].includes(field.typeMeta.name)) {
            if (field.typeMeta.array) {
                strs.push(`SET ${varName}.${field.fieldName} = [p in $${paramName} | point(p)]`);
            } else {
                strs.push(`SET ${varName}.${field.fieldName} = point($${paramName})`);
            }

            return;
        }

        strs.push(`SET ${varName}.${field.fieldName} = $${paramName}`);
    });

    return strs.join("\n");
}

export default createSetRelationshipProperties;
