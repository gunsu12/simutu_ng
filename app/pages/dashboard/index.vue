<script setup lang="ts">
import { DollarSign, Users, ShoppingCart, Activity, Calendar, BarChart3 } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { user } = useAuth()

const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: 20.1,
    changeLabel: 'vs last month',
    icon: DollarSign,
    iconBgColor: 'bg-success/10'
  },
  {
    title: 'Active Users',
    value: '2,350',
    change: 15.3,
    changeLabel: 'vs last month',
    icon: Users,
    iconBgColor: 'bg-primary/10'
  },
  {
    title: 'Total Orders',
    value: '12,234',
    change: -5.2,
    changeLabel: 'vs last month',
    icon: ShoppingCart,
    iconBgColor: 'bg-warning/10'
  },
  {
    title: 'Conversion Rate',
    value: '3.2%',
    change: 8.1,
    changeLabel: 'vs last month',
    icon: Activity,
    iconBgColor: 'bg-info/10'
  }
]

const recentActivities = [
  { id: 1, user: 'John Doe', action: 'Created new report', time: '2 min ago', type: 'create' },
  { id: 2, user: 'Jane Smith', action: 'Updated user settings', time: '15 min ago', type: 'update' },
  { id: 3, user: 'Mike Johnson', action: 'Deleted old records', time: '1 hour ago', type: 'delete' },
  { id: 4, user: 'Sarah Wilson', action: 'Added new user', time: '2 hours ago', type: 'create' },
  { id: 5, user: 'Tom Brown', action: 'Generated monthly report', time: '3 hours ago', type: 'create' }
]

const upcomingEvents = [
  { id: 1, title: 'Team Meeting', date: 'Today, 2:00 PM', type: 'meeting' },
  { id: 2, title: 'Project Deadline', date: 'Tomorrow, 5:00 PM', type: 'deadline' },
  { id: 3, title: 'Client Call', date: 'Jan 3, 10:00 AM', type: 'call' },
  { id: 4, title: 'Review Session', date: 'Jan 4, 3:00 PM', type: 'review' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-base-content">
          Welcome back, {{ user?.name?.split(' ')[0] || 'User' }}! 👋
        </h1>
        <p class="text-base-content/60 mt-1">Here's what's happening with your dashboard today.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm gap-2">
          <Calendar class="w-4 h-4" />
          Last 30 days
        </button>
        <button class="btn btn-primary btn-sm gap-2">
          <BarChart3 class="w-4 h-4" />
          Download Report
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardStatsCard
        v-for="stat in stats"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :change="stat.change"
        :change-label="stat.changeLabel"
        :icon="stat.icon"
        :icon-bg-color="stat.iconBgColor"
      />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Chart Placeholder -->
      <div class="lg:col-span-2 card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title text-lg">Revenue Overview</h2>
            <select class="select select-sm select-bordered">
              <option>Last 7 days</option>
              <option selected>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <!-- Chart Placeholder -->
          <div class="h-64 bg-base-200/50 rounded-lg flex items-center justify-center">
            <div class="text-center text-base-content/50">
              <BarChart3 class="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chart will be rendered here</p>
              <p class="text-sm">Integrate with Chart.js or similar</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Events -->
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">Upcoming Events</h2>
          <div class="space-y-4">
            <div 
              v-for="event in upcomingEvents" 
              :key="event.id"
              class="flex items-start gap-3 p-3 rounded-lg hover:bg-base-200/50 transition-colors cursor-pointer"
            >
              <div 
                class="w-2 h-2 mt-2 rounded-full"
                :class="{
                  'bg-primary': event.type === 'meeting',
                  'bg-error': event.type === 'deadline',
                  'bg-success': event.type === 'call',
                  'bg-warning': event.type === 'review'
                }"
              />
              <div class="flex-1">
                <p class="font-medium text-base-content">{{ event.title }}</p>
                <p class="text-sm text-base-content/60">{{ event.date }}</p>
              </div>
            </div>
          </div>
          <div class="mt-4">
            <button class="btn btn-ghost btn-sm w-full">View Calendar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title text-lg">Recent Activity</h2>
          <button class="btn btn-ghost btn-sm">View All</button>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="activity in recentActivities" :key="activity.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-primary text-primary-content rounded-full w-8">
                        <span class="text-xs">{{ activity.user.split(' ').map(n => n[0]).join('') }}</span>
                      </div>
                    </div>
                    <span class="font-medium">{{ activity.user }}</span>
                  </div>
                </td>
                <td>{{ activity.action }}</td>
                <td class="text-base-content/60">{{ activity.time }}</td>
                <td>
                  <span 
                    class="badge badge-sm"
                    :class="{
                      'badge-success': activity.type === 'create',
                      'badge-info': activity.type === 'update',
                      'badge-error': activity.type === 'delete'
                    }"
                  >
                    {{ activity.type }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
