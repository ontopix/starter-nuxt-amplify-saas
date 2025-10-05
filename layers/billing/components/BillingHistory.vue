<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-receipt" class="w-5 h-5 text-gray-600" />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Invoices
          </h2>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="invoice in invoices"
        :key="invoice.id"
        class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              Invoice #{{ invoice.number }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(invoice.date) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-semibold text-gray-900 dark:text-white">
              ${{ invoice.amount }}
            </p>
            <UBadge
              :color="getInvoiceStatusColor(invoice.status)"
              variant="subtle"
              size="sm"
            >
              {{ invoice.status }}
            </UBadge>
          </div>

          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-download"
            @click="$emit('downloadInvoice', invoice.id)"
            :loading="loading"
          >
            Download
          </UButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center">
        <UButton
          variant="ghost"
          @click="$emit('viewAllInvoices')"
          :loading="loading"
        >
          View All Invoices
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface Invoice {
  id: string
  number: string
  date: string
  amount: number
  status: string
}

interface Props {
  invoices: Invoice[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  downloadInvoice: [invoiceId: string]
  viewAllInvoices: []
}>()

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'green'
    case 'pending': return 'yellow'
    case 'failed': return 'red'
    case 'draft': return 'gray'
    default: return 'gray'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>