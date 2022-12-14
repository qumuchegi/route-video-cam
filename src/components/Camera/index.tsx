import React, { useState, useRef } from "react";
import { recordGPS } from "../../utils/recordGPS";
import createGpx from "gps-to-gpx";
import "./index.css";

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
  const [currentPosition, setCurrentPosition] = useState<{
    count: number;
    pos: GeolocationPosition;
  }>();
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
    const gpxBlob = new Blob([
      createGpx(
        videoPositions.current.map((item) => ({
          latitude: item.coords.latitude,
          longitude: item.coords.longitude,
          elevation: item.coords.altitude,
          time: item.timestamp,
        })),
        {
          activityName: "route-video-cam",
          startTime: videoPositions.current[0]?.timestamp,
        }
      ),
    ]);
    console.log("videoPositions", videoPositions.current);
    videoPositions.current = [];
    setCurrentPosition(undefined);
    posCountRef.current = 1;
    setRecordedVideoNodes((pre) => [
      ...pre,
      <div key={now}>
        <div>
          <video
            src={URL.createObjectURL(blob)}
            controls
            preload="metadata"
            width={window.screen.width}
            playsInline
          />
        </div>
        <div>??????????????????:</div>
        <a
          href={URL.createObjectURL(positionsFIleBlob)}
          download="position.json"
          className="download-btn"
        >
          JSON
        </a>
        <a
          href={URL.createObjectURL(gpxBlob)}
          download="position.gpx"
          className="download-btn"
        >
          GPX
        </a>
        <div>
          <span>
            ?????????
            {
              videoBlobMapToPositions.current.slice(-1)[0]?.positions.length
            }{" "}
            ??????????????? 10 ???:
          </span>
          {videoBlobMapToPositions.current
            .slice(-1)[0]
            ?.positions.slice(0, 10)
            .map((item, i) => (
              <div key={i}>
                {item.coords.latitude} {item.coords.longitude}
              </div>
            ))}
        </div>
      </div>,
    ]);
    recordedDataRef.current = [];
  };
  const posCountRef = useRef(1);
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
          setCurrentPosition({ pos: position, count: posCountRef.current++ });
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
      video: {
        facingMode: "environment",
      },
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
    <div className="container">
      <div onClick={onOpenCamera} className="button">
        ????????????????????????
      </div>
      <div onClick={onCloseCamera} className="button">
        ??????????????????????????????
      </div>
      {isRecordVideoStart && "????????????.."}
      <div>
        <video ref={videoRef} width={window.screen.width} playsInline />
      </div>
      <div>
        {!!currentPosition && (
          <span>
            {currentPosition.count}: ({currentPosition.pos.coords.latitude}{" "}
            {currentPosition.pos.coords.longitude})
          </span>
        )}
      </div>
      {!!recordedVideoNodes.length && (
        <div>
          <h2>???????????????</h2>
          {recordedVideoNodes.map((n, i) => (
            <details>
              <summary className="recorded-video-summary">
                ??? {i + 1} ???????????????GPS??????
              </summary>
              {n}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
