<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Integration', 'E2E', 'Regression');

pest()->extend(TestCase::class)
    ->in('Unit');
