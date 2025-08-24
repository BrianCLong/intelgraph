"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depthLimit = depthLimit;
const graphql_1 = require("graphql");
function depthLimit(maxDepth = 10) {
    return (context) => {
        let currentDepth = 0;
        let operationName = 'anonymous'; // Default operation name
        return {
            OperationDefinition: {
                enter(node) {
                    if (node.name && node.name.value) {
                        operationName = node.name.value;
                    }
                },
                leave() {
                    operationName = 'anonymous'; // Reset for next operation
                }
            },
            SelectionSet: {
                enter() {
                    currentDepth++;
                    if (currentDepth > maxDepth) {
                        context.reportError(new graphql_1.GraphQLError(`Query is too deep: depth ${currentDepth} > ${maxDepth} (operation: ${operationName})`));
                    }
                },
                leave() {
                    currentDepth--;
                }
            }
        };
    };
}
//# sourceMappingURL=depthLimit.js.map