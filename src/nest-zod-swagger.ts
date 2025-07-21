import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import {ZodArray, ZodEnum, ZodNullable, ZodObject, ZodOptional, ZodType} from 'zod';
import {createZodDto, ZodDto} from 'nestjs-zod';

function unwrapTo(schema: ZodType, type: 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'default' | 'nullable' | 'enum' | 'int'| 'array' | 'optional') {
  while (schema.def.type !== type && 'unwrap' in schema) {
    schema = (schema.unwrap as Function)()
  }
  return schema.def.type === type ? schema: false
}

export function ApiParamZod<T extends ZodType>({ name, schema }: { name: string; schema: T }) {
  const apiOptions = {
    name: name,
    required: !(schema instanceof ZodOptional),
    description: schema.description,
  };
  return applyDecorators(ApiParam({ ...apiOptions, type: String }));
}

export function ApiQueryZod<T extends ZodType>({ name, schema }: { name: string; schema: T }) {
  const array = unwrapTo(schema, 'array')
  const eenum = unwrapTo(schema, 'enum') as unknown as {options: string[]}
  const optional = unwrapTo(schema, 'optional')
  const apiOptions = {
    name,
    required: !optional,
    description: schema.description,
    isArray: !!array
  }
  if (eenum) {
    return applyDecorators(
        ApiQuery({
          ...apiOptions,
          enum: eenum.options
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

export function UseZodOpenApi<T extends ZodType | ZodDto>(
    zodTypeOrDto: T,
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
  const schema = 'schema' in zodTypeOrDto ? zodTypeOrDto.schema : zodTypeOrDto;
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
