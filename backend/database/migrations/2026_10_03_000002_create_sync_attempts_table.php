<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_id')->index();
            $table->string('status', 32)->default('pending')->index();
            $table->string('hubspot_deal_id')->nullable()->index();
            $table->string('hubspot_contact_id')->nullable()->index();
            $table->uuid('retry_of')->nullable()->index();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->string('failure_code')->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('order_id')->on('orders')->nullOnDelete();
            $table->foreign('retry_of')->references('id')->on('sync_attempts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_attempts');
    }
};
