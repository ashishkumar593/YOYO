import { ComplianceInterceptor } from './compliance.interceptor';
import { of } from 'rxjs';

describe('ComplianceInterceptor', () => {
  let interceptor: ComplianceInterceptor;

  beforeEach(() => {
    interceptor = new ComplianceInterceptor();
  });

  it('should attach x-yoyo-zero-data-retention header to HTTP response', (done) => {
    const mockHeader = jest.fn();
    const mockContext: any = {
      switchToHttp: () => ({
        getResponse: () => ({
          header: mockHeader,
        }),
      }),
    };

    const mockCallHandler: any = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
        expect(mockHeader).toHaveBeenCalledWith(
          'x-yoyo-zero-data-retention',
          'true'
        );
        done();
      },
    });
  });

  it('should gracefully handle responses without header function', (done) => {
    const mockContext: any = {
      switchToHttp: () => ({
        getResponse: () => ({}),
      }),
    };

    const mockCallHandler: any = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
        done();
      },
    });
  });
});

