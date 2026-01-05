function handleCopyClick(e: Event) {
  const button = (e.target as HTMLElement).closest('button.copy')
  if (!button) return

  const figure = button.closest('figure')
  const codeBlock = figure?.querySelector('code')
  if (!codeBlock) return

  const code = codeBlock.innerText

  navigator.clipboard.writeText(code).then(() => {
    button.classList.add('copied')

    const successIcon = button.querySelector('.success')
    const readyIcon = button.querySelector('.ready')

    successIcon?.classList.remove('hidden')
    readyIcon?.classList.add('hidden')

    setTimeout(() => {
      button.classList.remove('copied')
      successIcon?.classList.add('hidden')
      readyIcon?.classList.remove('hidden')
    }, 2000)
  })
}

function setupCodeCopy() {
  document.removeEventListener('click', handleCopyClick)
  document.addEventListener('click', handleCopyClick)
}

// Initial load
setupCodeCopy()

// Astro view transitions
document.addEventListener('astro:after-swap', setupCodeCopy)
