import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseHelper } from '../utils/response.util';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data is already formatted with 'success' and 'message', return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If data is empty and method is not returning anything (like void)
        if (data === undefined) {
          return ResponseHelper.success(null, 'Request Processed Successfully');
        }

        // Wrap the response in the standard success structure
        return ResponseHelper.success(data, 'Request Processed Successfully');
      }),
    );
  }
}
