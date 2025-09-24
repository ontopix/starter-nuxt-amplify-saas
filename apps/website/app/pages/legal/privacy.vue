<script setup>
// SEO Meta
useSeoMeta({
  title: 'Privacy Policy - Ontopix',
  ogTitle: 'Privacy Policy - Ontopix',
  description: 'Learn how Ontopix collects, uses, and protects your personal information. Our commitment to your privacy and data security.',
  ogDescription: 'Learn how Ontopix collects, uses, and protects your personal information. Our commitment to your privacy and data security.',
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
            { label: 'Privacy Policy' }
          ]"
          class="mb-8"
        />

        <div class="prose prose-lg dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>

          <p class="text-gray-600 dark:text-gray-300">
            <strong>Last updated:</strong> {{ lastUpdated }}
          </p>

          <p>
            At Ontopix, we take your privacy seriously. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you visit our website or use our services.
          </p>

          <h2>Information We Collect</h2>

          <h3>Personal Information</h3>
          <p>
            We may collect personal information that you voluntarily provide to us when you:
          </p>
          <ul>
            <li>Register for an account</li>
            <li>Subscribe to our newsletter</li>
            <li>Contact us through our website</li>
            <li>Use our virtual agent services</li>
          </ul>

          <h3>Usage Information</h3>
          <p>
            We automatically collect certain information when you visit our website, including:
          </p>
          <ul>
            <li>IP address and location data</li>
            <li>Browser type and version</li>
            <li>Pages visited and time spent</li>
            <li>Device information</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Improve user experience</li>
            <li>Send administrative information</li>
            <li>Respond to customer service requests</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties
            without your consent, except in the following circumstances:
          </p>
          <ul>
            <li>With your explicit consent</li>
            <li>To comply with legal requirements</li>
            <li>To protect our rights and safety</li>
            <li>With trusted service providers who assist in our operations</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your
            personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Object to processing of your information</li>
            <li>Data portability</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your browsing experience,
            analyze website traffic, and understand where our visitors are coming from.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@ontopix.com</li>
            <li>Address: 123 AI Street, Tech Valley, CA 94000</li>
          </ul>
        </div>
      </div>
    </UContainer>
  </div>
</template>

