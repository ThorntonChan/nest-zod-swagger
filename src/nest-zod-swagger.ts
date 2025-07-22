import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ZodEnum, ZodFirstPartyTypeKind, ZodObject, ZodOptional, ZodType } from 'zod';
import { createZodDto, ZodDto } from 'nestjs-zod';


type ZodTypeNames = typeof ZodFirstPartyTypeKind[keyof typeof ZodFirstPartyTypeKind];

function unwrapTo(schema: ZodType, type: ZodTypeNames) {
  while ((schema._def as any).typeName !== type && 'innerType' in schema._def) {
    schema = (schema._def.innerType as ZodType)
  }
  return (schema._def as any).typeName === type ? schema: false
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
  if ((schema._def as any).typeName as ZodTypeNames === 'ZodObject') {
    //@ts-ignore
    return applyDecorators(...Object.entries((schema as unknown as ZodObject<any>).shape).map(([k, v]): any =>
      ApiQueryZod({name: `${name}[${k}]`, schema: v as ZodType})
    ))
  }

  const array = unwrapTo(schema, ZodFirstPartyTypeKind['ZodArray'])
  const eenum = unwrapTo(schema, ZodFirstPartyTypeKind['ZodEnum'])
  const optional = unwrapTo(schema, ZodFirstPartyTypeKind['ZodOptional'])
  const nullable = unwrapTo(schema, ZodFirstPartyTypeKind['ZodNullable'])
  const apiOptions = {
    name,
    description: schema.description,
    required: !optional,
    nullable: !!nullable,
    isArray: !!array,
  }
  if (eenum) {
    return applyDecorators(
        ApiQuery({
          ...apiOptions,
          enum: (eenum as ZodEnum<any>)._def.values
        })
    );
  }
  return applyDecorators(ApiQuery({ ...apiOptions, type: String }));
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
