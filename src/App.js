import React, { useCallback, useEffect, useRef, useState } from "react"
import { isMobile } from "react-device-detect"
import "./App.css"

function App() {
  const [isCapturing, setCapturing] = useState(false)
  const [isRecording, setRecording] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState([])
  const [videoURL, setVideoURl] = useState("")
  const [log, setLog] = useState("")
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const audioStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)

  const getScreenStream = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })
      setCapturing(true)
      const videoElement = videoRef.current
      videoElement.srcObject = streamRef.current

      streamRef.current.oninactive = (e) => {
        setLog("Stream inactive")
        stopStreamedVideo()
      }
      streamRef.current.getVideoTracks()[0].onended = function () {
        setLog("Stream videotrack onended")
        stopStreamedVideo()
      }
      streamRef.current.getVideoTracks()[0].oninactive = function () {
        setLog("Stream videotrack oninactive")
        stopStreamedVideo()
      }
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play()
          resolve()
        }
      })
    } catch (err) {
      console.error("Error: " + err)
    }
  }

  const stopVideoTracks = (videoElement) => {
    const tracks = videoElement.srcObject.getTracks()
    tracks.forEach((track) => track.stop())
    videoElement.srcObject = null
  }

  const stopStreamedVideo = () => {
    const videoElement = videoRef.current
    if (videoElement.srcObject) stopVideoTracks(videoElement)
    videoElement.srcObject = null
    setCapturing(false)
  }

  const startRecording = () => {
    urlObjectCleanUp()
    setRecordedChunks([])
    setVideoURl("")
    setRecording(true)
    const stream = videoRef.current.srcObject
    audioStreamRef.current &&
      stream.addTrack(audioStreamRef.current.getAudioTracks()[0])
    mediaRecorderRef.current = new MediaRecorder(stream)
    mediaRecorderRef.current.addEventListener(
      "dataavailable",
      handleDataAvailable
    )
    mediaRecorderRef.current.start()
  }

  const handleDataAvailable = ({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => prev.concat(data))
    }
    setRecording(false)
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    setRecording(false)
  }

  useEffect(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks)
      const url = window.URL.createObjectURL(blob)
      setVideoURl(url)
    }
  }, [recordedChunks])

  const urlObjectCleanUp = useCallback(() => {
    //let browser discard video file reference
    videoURL && window.URL.revokeObjectURL(videoURL)
  }, [videoURL])

  //clean up video file reference on unmount
  useEffect(() => {
    return () => {
      urlObjectCleanUp()
    }
  }, [])

  const getAudioStream = async () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        audioStreamRef.current = stream
      })
      .catch((err) => {
        console.log(err)
      })
  }

  useEffect(() => getAudioStream(), [])

  return (
    <div className="App">
      {isMobile && (
        <div className="not-supported-container">
          <p className="not-supported-text">
            Unfortunately, Screen Capture is not supported on mobiles.
          </p>
        </div>
      )}
      <button
        onClick={() => (isCapturing ? stopStreamedVideo() : getScreenStream())}
      >
        {isCapturing ? "Stop" : "Start"} Screen Share
      </button>
      <br />
      <video
        ref={videoRef}
        id="input"
        muted
        width="640"
        height="480"
        hidden={!isCapturing}
      ></video>
      {isCapturing && (
        <div>
          <button
            onClick={() => (isRecording ? stopRecording() : startRecording())}
          >
            {isRecording ? "Stop" : "Start"} Recording
          </button>
        </div>
      )}
      {videoURL && (
        <div class="recorded-video-container">
          <p>Recorded Video</p>
          <video
            width="640"
            height="480"
            controls
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            style={{ objectFit: "contain" }}
          >
            <source src={videoURL} />
          </video>
        </div>
      )}
      {/* {log && <p>Log: {log}</p>} */}
    </div>
  )
}

export default App
