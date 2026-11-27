'use client'

import { MotionConfig } from 'motion/react'
import { FinalCta, Roles, Steps } from './Closing'
import { Header } from './Header'
import { Hero } from './Hero'
import './landing.css'
import { CapabilityWall, Platform } from './Platform'
import { Monitoring, Numbers, Records } from './Records'

/** The public front page. Motion follows the visitor's reduced-motion setting. */
export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <Header />
        <main>
          <Hero />
          <CapabilityWall />
          <Platform />
          <Records />
          <Monitoring />
          <Numbers />
          <Roles />
          <Steps />
          <FinalCta />
        </main>
      </div>
    </MotionConfig>
  )
}
