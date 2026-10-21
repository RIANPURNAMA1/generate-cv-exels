<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $r = $next($request);
        $r->headers->set('X-Content-Type-Options', 'nosniff');
        $r->headers->set('X-Frame-Options', 'DENY');
        $r->headers->set('Referrer-Policy', 'no-referrer');
        $r->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $r->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $r->headers->set('Cache-Control', 'no-store');
        return $r;
    }
}
