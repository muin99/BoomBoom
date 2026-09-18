import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("GridWise Energy Optimization API")
      .setVersion("1.0.0")
      .setDescription(
        "BUP CSE Fest 2026. LLM interpretation, deterministic validation and optimal energy scheduling. Secrets remain server-side.",
      )
      .build(),
  );
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: { persistAuthorization: false },
  });
  return document;
}
