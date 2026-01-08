export interface Toast {
    id: string
    title: string
    description?: string
    color?: 'green' | 'red' | 'blue' | 'yellow'
    duration?: number
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
    const add = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast = {
            ...toast,
            id,
            duration: toast.duration || 3000
        }
        toasts.value.push(newToast)

        if (newToast.duration > 0) {
            setTimeout(() => {
                remove(id)
            }, newToast.duration)
        }
    }

    const remove = (id: string) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts,
        add,
        remove
    }
}
