import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ZodArray, ZodEnum, ZodNativeEnum, ZodObject, ZodType } from 'zod';
import { createZodDto } from 'nestjs-zod';

function isZodEnum(schema: ZodType): schema is ZodEnum<any> | ZodNativeEnum<any> {
  return (schema as any)._def.typeName === 'ZodEnum' || (schema as any)._def.typeName === 'ZodNativeEnum';
}

function isZodArray(schema: ZodType): schema is ZodArray<any> {
  return (schema as any)._def.typeName === 'ZodArray';
}

export function ApiParamZod<T extends ZodType>({ name, schema }: { name: string; schema: T }) {
  const apiOptions = {
    name: name,
    required: !schema.isOptional(),
    description: schema._def.description,
  };
  return applyDecorators(ApiParam({ ...apiOptions, type: String }));
}

export function ApiQueryZod<T extends ZodType>({ name, schema }: { name: string; schema: T }) {
  const apiOptions = {
    name,
    required: !schema.isOptional(),
    description: schema._def.description,
  };
  if (isZodArray(schema)) {
    return applyDecorators(
        ApiQuery({
          ...apiOptions,
          isArray: true,
          type: String,
        })
    );
  }
  if (isZodEnum(schema)) {
    return applyDecorators(
        ApiQuery({
          ...apiOptions,
          enum: schema._def.values,
          example: schema._def.values[0],
        })
    );
  }
  return ApiQuery({ ...apiOptions, type: String });
}

function generateParamDecorators<
    T extends ZodObject<{
      [key: string]: ZodType;
    }>,
>(schema: T) {
  const pathShape = schema.shape;
  if (!pathShape) {
    throw new Error('Schema must have a path shape to generate path decorators');
  }
  const pathParams = Object.keys(pathShape as {});
  const decorators = pathParams.map((paramName) => {
    return ApiParamZod({
      name: paramName,
      schema: pathShape[paramName],
    });
  });
  return decorators;
}

function generateQueryDecorators<
    T extends ZodObject<{
      [key: string]: ZodType;
    }>,
>(schema: T) {
  const queryShape = schema.shape;
  if (!queryShape) {
    throw new Error('Schema must have a query shape to generate query decorators');
  }
  const queryParams = Object.keys(queryShape as {});
  const decorators = queryParams.map((paramName) => {
    return ApiQueryZod({
      name: paramName,
      schema: schema.shape[paramName],
    });
  });
  return decorators;
}

function generateBodyDecorators<
    T extends ZodObject<{
      [key: string]: ZodType;
    }>,
>(schema: T) {
  const bodyShape = schema;
  if (!bodyShape) {
    throw new Error('Schema must have a body shape to generate body decorators');
  }
  return ApiBody({
    type: createZodDto(bodyShape as ZodType),
  });
}

export function UseZodOpenApi<T extends ZodType>(
    schema: T,
    opts: {
      body?: boolean;
      path?: boolean;
      query?: boolean;
    } = {
      body: true,
      path: true,
      query: true,
    }
) {
  const decorators: MethodDecorator[] = [];
  if (opts?.path && (schema as unknown as ZodObject<any>).shape?.path) {
    decorators.push(...generateParamDecorators((schema as unknown as ZodObject<any>).shape.path));
  }
  if (opts?.query && (schema as unknown as ZodObject<any>).shape?.query) {
    decorators.push(...generateQueryDecorators((schema as unknown as ZodObject<any>).shape.query));
  }
  if (opts?.body && (schema as unknown as ZodObject<any>).shape?.body) {
    decorators.push(generateBodyDecorators((schema as unknown as ZodObject<any>).shape.body));
  }
  return applyDecorators(...decorators);
}
