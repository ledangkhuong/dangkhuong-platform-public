'use client'

import ReactDOM from 'react-dom'

export default function PreloadResources() {
  ReactDOM.preconnect('https://www.youtube.com', { crossOrigin: 'anonymous' })
  ReactDOM.preconnect('https://connect.facebook.net')
  ReactDOM.prefetchDNS('https://i.ytimg.com')
  return null
}
