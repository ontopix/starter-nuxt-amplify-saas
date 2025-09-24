<script setup>
// SEO Meta
useSeoMeta({
  title: $t('start.seo.title'),
  ogTitle: $t('start.seo.ogTitle'),
  description: $t('start.seo.description'),
  ogDescription: $t('start.seo.ogDescription'),
  ogImage: '/og.png',
  twitterCard: 'summary_large_image'
})

useHead({
  script: [
    {
      src: "https://unpkg.com/@elevenlabs/convai-widget-embed",
      async: true,
      type: "text/javascript"
    }
  ]
})

</script>

<template>
  <div>
    <!-- Hero Section -->
    <UPageSection id="hero">
      <UContainer class="text-center max-w-4xl mx-auto h-screen">
        <h1 class="text-4xl md:text-6xl font-bold mb-6">Demo MaxColchon</h1>
        <p class="mb-4">
          Bienvenido a esta demostración personalizada de <span class="font-semibold">Ontopix</span> para <span class="font-semibold">MaxColchon</span>.
        </p>
        <p class="mb-4">
          El objetivo de esta página es mostrar, de forma práctica, las capacidades de nuestros agentes virtuales de voz.
        </p>
        <p class="mb-4">
          Esta página es temporal y estará disponible únicamente durante la demostración.
        </p>
        <p>
          Si tienes alguna pregunta o deseas más información, por favor <NuxtLink to="mailto:info@ontopix.ai" class="text-gradient-violet">contáctanos</NuxtLink>.
          Estaremos encantados de ayudarte.
        </p>
        <elevenlabs-convai agent-id="agent_0201k5m3tahxea4tcjfp7vwem74k"></elevenlabs-convai>
      </UContainer>
    </UPageSection>
  </div>
</template>
