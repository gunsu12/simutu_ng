<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[6rem] p-3'
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, false)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="border border-base-300 rounded-lg overflow-hidden bg-base-100">
    <!-- Toolbar -->
    <div v-if="editor" class="flex items-center gap-1 p-2 border-b border-base-300 bg-base-200/50">
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'bg-base-300': editor.isActive('bold') }"
        class="btn btn-xs btn-ghost"
        title="Bold"
      >
        <Bold class="w-4 h-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'bg-base-300': editor.isActive('italic') }"
        class="btn btn-xs btn-ghost"
        title="Italic"
      >
        <Italic class="w-4 h-4" />
      </button>
      <div class="divider divider-horizontal mx-0"></div>
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'bg-base-300': editor.isActive('bulletList') }"
        class="btn btn-xs btn-ghost"
        title="Bullet List"
      >
        <List class="w-4 h-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-base-300': editor.isActive('orderedList') }"
        class="btn btn-xs btn-ghost"
        title="Numbered List"
      >
        <ListOrdered class="w-4 h-4" />
      </button>
      <div class="divider divider-horizontal mx-0"></div>
      <button
        type="button"
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().undo()"
        class="btn btn-xs btn-ghost"
        title="Undo"
      >
        <Undo class="w-4 h-4" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().redo()"
        class="btn btn-xs btn-ghost"
        title="Redo"
      >
        <Redo class="w-4 h-4" />
      </button>
    </div>
    
    <!-- Editor Content -->
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
/* TipTap Editor Styles */
.ProseMirror {
  outline: none;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.ProseMirror ul {
  list-style-type: disc;
}

.ProseMirror ol {
  list-style-type: decimal;
}

.ProseMirror li {
  margin: 0.25rem 0;
}

.ProseMirror h1 {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

.ProseMirror h2 {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0.75rem 0 0.5rem;
}

.ProseMirror h3 {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0.5rem 0 0.25rem;
}

.ProseMirror p {
  margin: 0.5rem 0;
}

.ProseMirror strong {
  font-weight: bold;
}

.ProseMirror em {
  font-style: italic;
}
</style>
