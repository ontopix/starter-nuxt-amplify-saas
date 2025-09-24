<script setup lang="ts">
const props = defineProps({
  error: {
    type: Object,
    required: true
  }
});

const headline = computed(() => {
  return String(props.error.statusCode || "ERROR")
})

const title = computed(() => {
  return "Something went wrong"
})

const description = computed(() => {
  return props.error.message || "This page could not be found or an error occurred."
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <UPage>
        <UContainer>
          <UPageSection
            :headline="headline"
            :title="title"
            :description="description"
          >
          <div class="flex justify-center">
            <UButton
              :to="$localePath('/')"
              label="Back to home"
              size="xl"
            />
          </div>
          </UPageSection>
        </UContainer>
      </UPage>
    </NuxtLayout>
  </UApp>
</template>


