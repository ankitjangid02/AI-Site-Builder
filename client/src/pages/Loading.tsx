import { LoaderPinwheel } from 'lucide-react'
import { useEffect } from 'react'

const Loading = () => {

    useEffect(()=>{
        setTimeout(()=>{
            window.location.href = '/'
        },4000)
    },[])

  return (
    <div className='flex items-center justify-center h-full min-h-[500px]'>
      <div>
        <LoaderPinwheel className='size-75 animate-spin text-indigo-200'/>
      </div>
    </div>
  )
}

export default Loading
