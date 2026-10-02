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
     * Supports both candidate brief format and camelCase aliases.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'event' => ['nullable', 'string'],
            'orderId' => ['required_without:order_id', 'string'],
            'order_id' => ['required_without:orderId', 'string'],
            'customer' => ['required', 'array'],
            'customer.email' => ['required', 'email'],
            'customer.name' => ['nullable', 'string'],
            'customer.first_name' => ['nullable', 'string'],
            'customer.last_name' => ['nullable', 'string'],
            'customer.phone' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku' => ['required', 'string'],
            'items.*.name' => ['nullable', 'string'],
            'items.*.quantity' => ['required_without:items.*.qty', 'integer', 'min:1'],
            'items.*.qty' => ['required_without:items.*.quantity', 'integer', 'min:1'],
            'items.*.unitPrice' => ['required_without:items.*.price', 'numeric', 'min:0'],
            'items.*.price' => ['required_without:items.*.unitPrice', 'numeric', 'min:0'],
            'total' => ['nullable', 'numeric', 'min:0'],
            'totalAmount' => ['nullable', 'numeric', 'min:0'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'createdAt' => ['nullable', 'string'],
            'created_at' => ['nullable', 'string'],
        ];
    }

    /**
     * Configure validator instance to ensure at least one total field is present.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $hasTotal = $this->has('total') || $this->has('total_amount') || $this->has('totalAmount');
            if (! $hasTotal) {
                $validator->errors()->add('total', 'The total, total_amount, or totalAmount field is required.');
            }
        });
    }
}
