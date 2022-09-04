import React, { useState, useRef } from "react";
import { recordGPS } from "../../utils/recordGPS";

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream>();
  const videoRecorderRef = useRef<MediaRecorder>();
  const recordedDataRef = useRef<Blob[]>([]);
  const removePosWatcher = useRef<() => void>();
  const [isRecordVideoStart, setIsRecordVideoStart] = useState(false);
  const [isRecordVideoEnd, setIsRecordVideoEnd] = useState(false);
  const videoPositions = useRef<GeolocationPosition[]>([]);
  const [recordedVideoNodes, setRecordedVideoNodes] = useState<JSX.Element[]>(
    []
  );
  const videoBlobMapToPositions = useRef<
    {
      endTimeStamp: number;
      videoData: Blob;
      positions: GeolocationPosition[];
    }[]
  >([]);

  const genRecordedVideo = () => {
    const blob = new Blob(recordedDataRef.current, { type: "video/mp4" });
    console.log({ genRecordedVideo: blob });
    const now = +new Date();
    videoBlobMapToPositions.current.push({
      endTimeStamp: now,
      videoData: blob,
      positions: videoPositions.current,
    });
    const positionsFIleBlob = new Blob([
      JSON.stringify(
        videoPositions.current.map((item) => ({
          timeStamp: item.timestamp,
          coords: {
            accuracy: item.coords.accuracy,
            altitude: item.coords.altitude,
            altitudeAccuracy: item.coords.altitudeAccuracy,
            heading: item.coords.heading,
            latitude: item.coords.latitude,
            longitude: item.coords.longitude,
            speed: item.coords.speed,
          },
        }))
      ),
    ]);
    console.log("videoPositions", videoPositions.current);
    videoPositions.current = [];
    setRecordedVideoNodes((pre) => [
      ...pre,
      <div key={now}>
        <video src={URL.createObjectURL(blob)} controls width={200} />
        <a href={URL.createObjectURL(positionsFIleBlob)} download>
          下载位置信息
        </a>
        <div>
          {videoBlobMapToPositions.current
            .slice(-1)[0]
            ?.positions.map((item, i) => (
              <div key={i}>
                {item.coords.latitude} - {item.coords.longitude}
              </div>
            ))}
        </div>
      </div>,
    ]);
    recordedDataRef.current = [];
  };
  const onRecordVideo = () => {
    if (videoStreamRef.current) {
      videoRecorderRef.current = new MediaRecorder(videoStreamRef.current);
      videoRecorderRef.current.ondataavailable = (evt) => {
        console.log({ "ondataavailable:": evt.data });
        recordedDataRef.current.push(evt.data);
      };
      videoRecorderRef.current.start();
      videoRecorderRef.current.onstart = () => {
        setIsRecordVideoStart(true);
        removePosWatcher.current = recordGPS((position) => {
          videoPositions.current = [...videoPositions.current, position];
          // setVideoPositions((pre) => [...pre, position]);
          console.log(
            { position }
            //   {
            //   latitude: position.coords.latitude,
            //   longitude: position.coords.longitude,
            //   timestamp: position.timestamp,
            // }
          );
        });
      };
      videoRecorderRef.current.onstop = () => {
        setIsRecordVideoStart(false);
        setIsRecordVideoEnd(true);
        genRecordedVideo();
        removePosWatcher.current?.();
      };
    }
  };
  const onCloseRecord = () => {
    videoRecorderRef.current?.stop();
  };
  const onOpenCamera = async () => {
    videoStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: false,
      // {
      //   noiseSuppression: true,
      // },
      video: true,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = videoStreamRef.current;
      videoRef.current.onloadedmetadata = (e) => {
        videoRef.current?.play();
        onRecordVideo();
      };
    }
  };
  const onCloseCamera = () => {
    if (videoStreamRef.current) {
      onCloseRecord();
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };
  return (
    <div>
      <button onClick={onOpenCamera}>打开摄像头并录像</button>
      <button onClick={onCloseCamera}>关闭摄像头和结束录像</button>
      {isRecordVideoStart && "正在录像.."}
      <div>
        <video ref={videoRef} />
      </div>
      <div>
        <h4>录制视频：</h4>
        {recordedVideoNodes}
      </div>
    </div>
  );
}
