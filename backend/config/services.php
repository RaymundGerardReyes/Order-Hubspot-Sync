<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'internal' => [
        'token' => env('INTERNAL_TOKEN', 'internal_shared_bearer_token'),
    ],

    'hubspot' => [
        'access_token' => env('HUBSPOT_ACCESS_TOKEN'),
        'base_url' => env('HUBSPOT_BASE_URL', 'https://api.hubapi.com'),
        'pipeline_id' => env('HUBSPOT_PIPELINE_ID', 'default'),
        'stage_id' => env('HUBSPOT_STAGE_ID', 'closedwon'),
    ],

];
