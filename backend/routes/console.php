<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
*/

// Example scheduled cleanup / stuck attempt recovery
Schedule::command('queue:prune-failed --hours=168')->daily();
