

import { ZodDto, ZodValidationPipe } from 'nestjs-zod';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { z, ZodType } from 'zod';

export function ValidatedPath<T extends ZodDto>(zodDto: T) {
  return createParamDecorator(
      (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().params
  )(
      undefined, // metadata
      new ZodValidationPipe(
          (
              zodDto as unknown as ZodDto & {
                schema: {
                  shape: {
                    path: ZodType;
                  };
                };
              }
          ).schema?.shape?.path
      )
  );
}

export function ValidatedQuery<T extends ZodDto>(zodDto: T) {
  return createParamDecorator(
      (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().query
  )(
      undefined, // metadata
      new ZodValidationPipe(
          (
              zodDto as unknown as ZodDto & {
                schema: {
                  shape: {
                    query: ZodType;
                  };
                };
              }
          ).schema?.shape?.query
      )
  );
}

export function ValidatedBody<T extends ZodDto>(zodDto: T) {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().body)(
      undefined, // metadata
      new ZodValidationPipe(
          (
              zodDto as unknown as ZodDto & {
                schema: {
                  shape: {
                    body: ZodType;
                  };
                };
              }
          ).schema?.shape?.body
      )
  );
}

export function ValidatedRequest<T extends ZodDto, R = z.infer<T['schema']>>(dto: T) {
  return createParamDecorator(async (data: unknown, ctx: ExecutionContext): Promise<R> => {
    const request = ctx.switchToHttp().getRequest();
    const { params, query, body } = request;
    return (await new ZodValidationPipe(dto.schema).transform(
        { path: params, query, body },
        {
          type: 'custom',
          metatype: Object,
          data: undefined,
        }
    )) as unknown as R;
  })();
}
