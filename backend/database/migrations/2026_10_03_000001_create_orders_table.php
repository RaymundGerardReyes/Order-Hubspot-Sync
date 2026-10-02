<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->string('order_id')->primary();
            $table->string('hubspot_deal_id')->nullable()->index();
            $table->string('hubspot_contact_id')->nullable()->index();
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('customer_email')->index();
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
