import fs from "fs";
import path from "path";

// Read the centralized Swagger specification from the docs folder
const swaggerPath = path.resolve(__dirname, "../../../docs/api-spec.json");

export const swaggerSpec = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));