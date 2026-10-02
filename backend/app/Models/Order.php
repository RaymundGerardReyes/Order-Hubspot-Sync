<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $primaryKey = 'order_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'order_id',
        'hubspot_deal_id',
        'hubspot_contact_id',
        'total_amount',
        'currency',
        'customer_email',
        'payload',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'payload' => 'array',
    ];

    /**
     * An order has many sync attempts.
     */
    public function syncAttempts(): HasMany
    {
        return $this->hasMany(SyncAttempt::class, 'order_id', 'order_id');
    }
}
