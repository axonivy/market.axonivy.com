<?php

namespace app\api;

use OpenApi\Attributes\AdditionalProperties;
use OpenApi\Attributes\Components;
use OpenApi\Attributes\Info;
use OpenApi\Attributes\Items;
use OpenApi\Attributes\OpenApi;
use OpenApi\Attributes\Property;
use OpenApi\Attributes\Schema;
use OpenApi\Attributes\Server;

#[OpenApi(
  openapi: '3.1.0',
  info: new Info(
    title: 'Axon Ivy Market API',
    version: '1.0.0',
    description: 'Product search, artifact versions, installation descriptors, and product images.'
  ),
  servers: [new Server(url: '/stable')],
  components: new Components(schemas: [
    new Schema(
      schema: 'ProductModel',
      type: 'object',
      properties: [
        new Property(property: 'id', type: 'string'),
        new Property(property: 'names', type: 'object', additionalProperties: new AdditionalProperties(type: 'string')),
        new Property(property: 'shortDescriptions', type: 'object', additionalProperties: new AdditionalProperties(type: 'string')),
        new Property(property: 'logoUrl', type: 'string'),
        new Property(property: 'logoDarkUrl', type: 'string'),
        new Property(property: 'badgeUrl', type: 'string'),
        new Property(property: 'badgeDarkUrl', type: 'string'),
        new Property(property: 'type', type: 'string'),
        new Property(property: 'tags', type: 'array', items: new Items(type: 'string')),
        new Property(property: 'marketDirectory', type: 'string'),
        new Property(property: 'deprecated', type: 'boolean'),
        new Property(property: 'internal', type: 'boolean'),
      ]
    ),
    new Schema(
      schema: 'MavenArtifactKey',
      type: 'object',
      properties: [
        new Property(property: 'artifactId', type: 'string'),
        new Property(property: 'productVersion', type: 'string'),
        new Property(property: 'additionalVersion', type: 'boolean'),
      ]
    ),
    new Schema(
      schema: 'MavenArtifactVersion',
      type: 'object',
      properties: [
        new Property(property: 'id', ref: '#/components/schemas/MavenArtifactKey'),
        new Property(property: 'name', type: 'string'),
        new Property(property: 'downloadUrl', type: 'string', format: 'uri'),
        new Property(property: 'groupId', type: 'string'),
        new Property(property: 'productId', type: 'string'),
        new Property(property: 'invalidArtifact', type: 'boolean'),
      ]
    ),
    new Schema(
      schema: 'MavenArtifactVersionModel',
      type: 'object',
      properties: [
        new Property(property: 'version', type: 'string'),
        new Property(
          property: 'artifactsByVersion',
          type: 'array',
          items: new Items(ref: '#/components/schemas/MavenArtifactVersion')
        ),
      ]
    ),
    new Schema(
      schema: 'BestMatchVersion',
      type: 'object',
      properties: [new Property(property: 'version', type: 'string')]
    ),
    new Schema(
      schema: 'InstallContent',
      type: 'object',
      additionalProperties: true
    ),
    new Schema(
      schema: 'ErrorResponse',
      type: 'object',
      properties: [new Property(property: 'message', type: 'string')]
    ),
  ])
)]
final class OpenApiDefinition
{
}