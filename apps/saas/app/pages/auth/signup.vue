<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Sign Up'
})

const state = ref('signup')
const onStateChange = (newState: string) => {
  state.value = newState
}

const onSignedIn = () => {
  navigateTo('/app')
}
</script>

<template>
  <Authenticator
    :state="state"
    @state-change="onStateChange"
    @signed-in="onSignedIn"
  />
</template>
