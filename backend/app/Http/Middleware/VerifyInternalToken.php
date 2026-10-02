<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyInternalToken
{
    /**
     * Handle incoming request and verify the internal shared token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedToken = config('services.internal.token');
        $providedToken = $request->header('X-Internal-Token');

        if (empty($expectedToken) || ! hash_equals((string) $expectedToken, (string) $providedToken)) {
            return response()->json([
                'error' => 'Unauthorized: Invalid or missing internal authentication token.',
            ], 401);
        }

        return $next($request);
    }
}
