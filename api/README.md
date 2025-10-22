API spec location
-----------------

Put your OpenAPI (Swagger) spec into `api/openapi.yaml` (YAML) or create `api/openapi.json` (JSON) next to it.

Validation
----------

You can validate the spec locally using one of these options:

- Install and run the `openapi-generator-cli` or `swagger-cli` (Node):

  ```powershell
  # install globally
  npm install -g @apidevtools/swagger-cli

  # validate
  swagger-cli validate api\openapi.yaml
  ```

- Or use an online validator: https://editor.swagger.io/ (paste or open the file).

Using the spec in the frontend
-----------------------------

You can add scripts to generate TypeScript API clients (e.g., using OpenAPI Generator) or use the spec for documentation. Let me know if you want me to wire up auto-generation into the project.
