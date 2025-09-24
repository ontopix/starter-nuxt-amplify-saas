<script setup>
// SEO Meta
useSeoMeta({
  title: 'Terms of Service - Ontopix',
  ogTitle: 'Terms of Service - Ontopix',
  description: 'Read Ontopix Terms of Service. Understand your rights and responsibilities when using our AI-powered virtual agent services.',
  ogDescription: 'Read Ontopix Terms of Service. Understand your rights and responsibilities when using our AI-powered virtual agent services.',
  robots: 'noindex, nofollow'
})

const lastUpdated = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
</script>

<template>
  <div class="section-spacing">
    <UContainer>
      <div class="max-w-4xl mx-auto">
        <!-- Breadcrumb -->
        <UBreadcrumb
          :links="[
            { label: 'Legal', to: '/legal' },
            { label: 'Terms of Service' }
          ]"
          class="mb-8"
        />

        <div class="prose prose-lg dark:prose-invert max-w-none">
          <h1>Terms of Service</h1>

          <p class="text-gray-600 dark:text-gray-300">
            <strong>Last updated:</strong> {{ lastUpdated }}
          </p>

          <p>
            Welcome to Ontopix. These Terms of Service ("Terms") govern your use of our website
            and services. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using Ontopix services, you accept and agree to be bound by the terms
            and provision of this agreement. If you do not agree to abide by the above, please do
            not use this service.
          </p>

          <h2>Description of Service</h2>
          <p>
            Ontopix provides AI-powered virtual agent solutions for customer service automation.
            Our services include but are not limited to:
          </p>
          <ul>
            <li>Virtual agent deployment and management</li>
            <li>Natural language processing capabilities</li>
            <li>Multi-channel customer support integration</li>
            <li>Analytics and reporting tools</li>
          </ul>

          <h2>User Accounts</h2>
          <p>
            To access certain features of our service, you may be required to create an account.
            You are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>

          <h2>Acceptable Use</h2>
          <p>You agree not to use our services to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit harmful or malicious content</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with the proper working of our services</li>
          </ul>

          <h2>Service Availability</h2>
          <p>
            While we strive to maintain high availability, we do not guarantee that our services
            will be available 100% of the time. We may experience downtime for maintenance,
            updates, or unforeseen circumstances.
          </p>

          <h2>Pricing and Payment</h2>
          <p>
            Pricing for our services is as specified on our website. Payment terms include:
          </p>
          <ul>
            <li>Payments are due according to your selected billing cycle</li>
            <li>All fees are non-refundable unless otherwise specified</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
          </ul>

          <h2>Intellectual Property</h2>
          <p>
            The Ontopix service and its original content, features, and functionality are and will
            remain the exclusive property of Ontopix and its licensors. The service is protected
            by copyright, trademark, and other laws.
          </p>

          <h2>Privacy</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs
            your use of the service, to understand our practices.
          </p>

          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the service immediately,
            without prior notice or liability, under our sole discretion, for any reason whatsoever
            and without limitation, including but not limited to a breach of the Terms.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            In no event shall Ontopix, nor its directors, employees, partners, agents, suppliers,
            or affiliates, be liable for any indirect, incidental, special, consequential, or
            punitive damages, including without limitation, loss of profits, data, use, goodwill,
            or other intangible losses.
          </p>

          <h2>Governing Law</h2>
          <p>
            These Terms shall be interpreted and governed by the laws of the State of California,
            without regard to conflict of law provisions.
          </p>

          <h2>Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
            If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
          </p>

          <h2>Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <ul>
            <li>Email: legal@ontopix.com</li>
            <li>Address: 123 AI Street, Tech Valley, CA 94000</li>
          </ul>
        </div>
      </div>
    </UContainer>
  </div>
</template>
