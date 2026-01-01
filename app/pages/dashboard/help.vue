<script setup lang="ts">
import { MessageCircle, FileText, ExternalLink, Search, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'You can reset your password from the Settings > Security page, or use the "Forgot Password" link on the login page.'
  },
  {
    question: 'How do I add a new team member?',
    answer: 'Navigate to Users page and click on "Add User" button. Fill in their details and they will receive an invitation email.'
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes, you can export your data from the Reports page. Select the report type and click "Download" to get your data in CSV or PDF format.'
  },
  {
    question: 'How do I change the theme?',
    answer: 'Go to Settings > Appearance and choose between Light and Dark themes. Your preference will be saved automatically.'
  }
]

const resources = [
  { title: 'Getting Started Guide', description: 'Learn the basics of using the dashboard', icon: FileText },
  { title: 'API Documentation', description: 'Integrate with our REST API', icon: FileText },
  { title: 'Video Tutorials', description: 'Watch step-by-step guides', icon: FileText },
  { title: 'Community Forum', description: 'Connect with other users', icon: MessageCircle }
]

const openFaq = ref<number | null>(null)

const toggleFaq = (index: number) => {
  openFaq.value = openFaq.value === index ? null : index
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="text-center max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-base-content">Help & Support</h1>
      <p class="text-base-content/60 mt-2">Find answers to your questions or get in touch with our support team.</p>
      
      <!-- Search -->
      <div class="relative mt-6">
        <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
        <input
          type="text"
          placeholder="Search for help..."
          class="input input-bordered input-lg w-full pl-12"
        />
      </div>
    </div>

    <!-- Quick Resources -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        v-for="resource in resources" 
        :key="resource.title"
        class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="card-body p-5">
          <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
            <component :is="resource.icon" class="w-5 h-5 text-primary" />
          </div>
          <h3 class="font-semibold">{{ resource.title }}</h3>
          <p class="text-sm text-base-content/60">{{ resource.description }}</p>
          <div class="flex items-center gap-1 text-primary text-sm mt-2">
            <span>Learn more</span>
            <ExternalLink class="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body">
        <h2 class="card-title text-lg mb-4">Frequently Asked Questions</h2>
        
        <div class="space-y-2">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="border border-base-300 rounded-lg overflow-hidden"
          >
            <button 
              class="w-full flex items-center justify-between p-4 text-left hover:bg-base-200/50 transition-colors"
              @click="toggleFaq(index)"
            >
              <span class="font-medium">{{ faq.question }}</span>
              <ChevronRight 
                class="w-5 h-5 transition-transform" 
                :class="{ 'rotate-90': openFaq === index }"
              />
            </button>
            <div 
              v-if="openFaq === index"
              class="px-4 pb-4 text-base-content/70"
            >
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Support -->
    <div class="card bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div class="card-body text-center">
        <h2 class="text-xl font-bold">Still need help?</h2>
        <p class="opacity-90">Our support team is available 24/7 to assist you.</p>
        <div class="flex flex-wrap justify-center gap-4 mt-4">
          <button class="btn btn-ghost bg-white/20 hover:bg-white/30 border-0">
            <MessageCircle class="w-4 h-4 mr-2" />
            Start Live Chat
          </button>
          <button class="btn btn-ghost bg-white/20 hover:bg-white/30 border-0">
            Email Support
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
