<?php

namespace app\api;

use OpenApi\Attributes as OA;

#[OA\OpenApi(
  openapi: '3.1.0',
  info: new OA\Info(
    title: 'Axon Ivy Market API',
    version: '1.0.0',
    description: 'Product search, artifact versions, installation descriptors, and product images.'
  ),
  servers: [new OA\Server(url: '/stable')],
  components: new OA\Components(schemas: [
    new OA\Schema(
      schema: 'ProductModel',
      type: 'object',
      properties: [
        new OA\Property(property: 'id', type: 'string'),
        new OA\Property(property: 'names', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'string')),
        new OA\Property(property: 'shortDescriptions', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'string')),
        new OA\Property(property: 'logoUrl', type: 'string'),
        new OA\Property(property: 'logoDarkUrl', type: 'string'),
        new OA\Property(property: 'badgeUrl', type: 'string'),
        new OA\Property(property: 'badgeDarkUrl', type: 'string'),
        new OA\Property(property: 'type', type: 'string'),
        new OA\Property(property: 'tags', type: 'array', items: new OA\Items(type: 'string')),
        new OA\Property(property: 'marketDirectory', type: 'string'),
        new OA\Property(property: 'deprecated', type: 'boolean'),
        new OA\Property(property: 'internal', type: 'boolean'),
      ]
    ),
    new OA\Schema(
      schema: 'MavenArtifactKey',
      type: 'object',
      properties: [
        new OA\Property(property: 'artifactId', type: 'string'),
        new OA\Property(property: 'productVersion', type: 'string'),
        new OA\Property(property: 'additionalVersion', type: 'boolean'),
      ]
    ),
    new OA\Schema(
      schema: 'MavenArtifactVersion',
      type: 'object',
      properties: [
        new OA\Property(property: 'id', ref: '#/components/schemas/MavenArtifactKey'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'downloadUrl', type: 'string', format: 'uri'),
        new OA\Property(property: 'groupId', type: 'string'),
        new OA\Property(property: 'productId', type: 'string'),
        new OA\Property(property: 'invalidArtifact', type: 'boolean'),
      ]
    ),
    new OA\Schema(
      schema: 'MavenArtifactVersionModel',
      type: 'object',
      properties: [
        new OA\Property(property: 'version', type: 'string'),
        new OA\Property(
          property: 'artifactsByVersion',
          type: 'array',
          items: new OA\Items(ref: '#/components/schemas/MavenArtifactVersion')
        ),
      ]
    ),
    new OA\Schema(
      schema: 'BestMatchVersion',
      type: 'object',
      properties: [new OA\Property(property: 'version', type: 'string')]
    ),
    new OA\Schema(
      schema: 'InstallContent',
      type: 'object',
      additionalProperties: true
    ),
    new OA\Schema(
      schema: 'ErrorResponse',
      type: 'object',
      properties: [new OA\Property(property: 'message', type: 'string')]
    ),
  ])
)]
final class OpenApiDefinition
{
}