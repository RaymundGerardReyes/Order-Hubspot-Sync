<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get validation rules for order webhook payload.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'orderId' => ['required_without:order_id', 'string'],
            'order_id' => ['required_without:orderId', 'string'],
            'customer' => ['required', 'array'],
            'customer.email' => ['required', 'email'],
            'customer.name' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku' => ['required', 'string'],
            'items.*.name' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unitPrice' => ['required', 'numeric', 'min:0'],
            'totalAmount' => ['required_without:total_amount', 'numeric', 'min:0'],
            'total_amount' => ['required_without:totalAmount', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'createdAt' => ['nullable', 'string'],
        ];
    }
}
