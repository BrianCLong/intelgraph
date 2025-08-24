import React from 'react'
import SearchBar from '../components/SearchBar'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="p-4">
        <SearchBar />
        {children}
      </body>
    </html>
  )
}
