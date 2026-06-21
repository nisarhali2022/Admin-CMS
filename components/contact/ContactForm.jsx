'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    event.currentTarget.reset()
    setSubmitted(true)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {submitted && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Thank you. Your message has been submitted successfully.
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-text-primary">
            Name
          </span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-text-primary">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-text-primary">
          Subject
        </span>
        <input
          type="text"
          name="subject"
          required
          className="w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="How can we help?"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-text-primary">
          Message
        </span>
        <textarea
          name="message"
          rows={6}
          required
          className="w-full resize-y rounded-lg border border-border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Write your message..."
        />
      </label>
      <button type="submit" className="btn-primary rounded-lg">
        Send Message
      </button>
    </form>
  )
}
