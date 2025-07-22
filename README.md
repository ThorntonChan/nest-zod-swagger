# NestJS Zod Swagger

A lightweight library based on [nestjs-zod](https://www.npmjs.com/package/nestjs-zod) and [nestjs-swagger](https://www.npmjs.com/package/@nestjs/swagger) for auto openapi registration (and optionally validation) for routes in NestJS.

## DISCLAIMER: WIP
The library is currently usable, but untested with advanced zod data types. As I am not a nestjs expert there are advanced features of 
nestjs did not attempt to utilize (e.g. metadata reflection).  
Future versions may perhaps use the validation decorators
(see below) to implement query and param metadata reflection and auto generation for further abstraction and increased accuracy.

Contributions are very welcome.

## Why
I wrote this because I don't like messy files. To my knowledge there is no way to autogenerate query or param docs with 
metadata reflection the way body does.  
- These decorators reduce our overhead by only needing one schema/dto which acts as the source of truth for all queries, params, and body.
- Because Zod types are extendable, we can also have centralized metadata (e.g. optional, description, etc.) as a single definition can be used in multiple routes.

```typescript
//Before:
@ApiQuery({name: 'query1', type: String, description: 'description'});
@ApiQuery({name: 'query2', type: String, description: 'description', required: true});
@ApiQuery({name: 'query3', type: String, description: 'description'});
@ApiParam({name: 'param', type: String, description});
@UseZodGuard('query', QuerySchema);
@UseZodGuard('param', ParamSchema);
findOne(
@Body(new ValidationPipe(...)) Body: BodyDto
){...}

//After:
@UseZodOpenApi(RequestDto)
findOne(@ValidatedRequest() Body: BodyDto){...}
```


## Installation

```bash
npm install nest-zod-swagger
```

### Peer Dependencies
While it should work, this library has not been tested with earlier versions of nestjs or zod.
- @nestjs/common: ^11.0.0,
- @nestjs/swagger: ^11.2.0,
- nestjs-zod: >=4.3.1,
- zod: **^3** (nestjs-zod currently doesn't fully support zod 4)


## Swagger type generation
First define your request schema. Zod types should include a combination of a
- a **path** ZodObject
- a **query** ZodObject
- a **body** ZodObject

```typescript
import { z } from 'zod';
import { ZodDto } from 'nestjs-zod';

const requestSchema = z.object({
  path: z.object({ id: z.string().describe('The user id') }),
  query: z.object({
    country: z.enum(['us', 'gb', 'au']).describe('Country to see results for'),
    page: z.string().transform((val) => parseInt(val, 10)).describe('Page number for pagination'),
  }),
  body: z.object({ unrequired: z.string().optional(), required: z.string() }),
});

export class requestSchemaDto extends createZodDto(getPortfolioRequest) {}
```

### UseZodOpenApi
The useZodOpenApi decorator will generate the openApi document based on dto.schema (or custom zod object). It will infer
the openApi 'required' trait if a ZodType is a ZodOptional, you can also describe() your zod field and provide transformations.
By default all of the path parameters are strings, while query parameters are either strings, string enums, or string arrays

```typescript
import {useZodOpenApi} from "./SwaggerZod";

@useZodOpenApi(requestSchemaDta.schema)
@Get(':id')
findOne() {...})

// `@useZodOpenApi(requestSchemaDta.schema)` takes a second `opts` parameter that can be used to discrimiate what should be included by swagger.
@useZodOpenApi(requestSchemaDta.schema, {path: true}) // will only generate path params in swagger
```

#### Custom path and query fields

  ```typescript
import { ApiQueryZod } from "./SwaggerZod";
@useZodOpenApi(requestSchemaDta.schema)
@ApiQueryZod('hair', z.enum(['black','brown','blonde']))
@ApiParamZod('id', z.string())
findOne() {...}
```

## Optional - request validation

#### ValidatedRequest
Validate the path, query and body parameters in the request with a single decorator
```typescript
@Get(':id')
findOne(@ValidatedRequest(requestSchemaDto) { path, query, params }: requestSchemaDto) {...}
```

#### Separate validation
For more granularity, beyond this you can just use the pipeline validation provided by [nestjs-zod](https://www.npmjs.com/package/nestjs-zod)
```typescript
findOne(
    @ValidatedPath(requestSchemaDto) path: requestSchemaDto['path']) 
    @ValidatedQuery(requestSchemaDto) query: requestSchemaDto['query']) 
    @ValidatedBody(requestSchemaDto) body: requestSchemaDto['body'])
){...}
```

## API Reference

#### `@useZodOpenApi(schema: ZodObject, opts: { path: boolean, query: boolean, body: boolean })`
Extracts OpenApi types from custom ZodObject

#### `@ApiQueryZod({name: string, ZodObject})`
Inserts a new query parameter in the OpenApi specification for the route

#### `@ApiParamZod({name: string, ZodObject})`
Inserts a new path parameter in the OpenApi specification for the route

#### `@ValidatedRequest(dto: ZodDto)`
Validates and extracts request parameters using a Zod schema.

#### `@ValidatedPath(dto: ZodDto)`
Validates and extracts path parameters using a Zod schema.

#### `@ValidatedQuery(dto: ZodDto)`
Validates and extracts query parameters using a Zod schema.

#### `@ValidatedBody(dto: ZodDto)`
Validates and extracts the request body using a Zod schema.

### License

MIT
