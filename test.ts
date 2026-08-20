let testDistance = 0
let testHandDetected = false

a4MicroSystemShiFuMi.setDiscServoAngle(90)
a4MicroSystemShiFuMi.setDiscBacklightBrightness(30)
a4MicroSystemShiFuMi.setDiscBacklightColor(a4MicroSystemShiFuMi.ShiFuMiColor.Blue)
a4MicroSystemShiFuMi.setDiscBacklightRgb(255, 100, 0)
a4MicroSystemShiFuMi.discBacklightOff()

a4MicroSystemShiFuMi.lcdInit()
a4MicroSystemShiFuMi.lcdClear()
a4MicroSystemShiFuMi.lcdShowTextLine("SHIFUMI READY", 1)
a4MicroSystemShiFuMi.lcdShowNumberLine(0, 2)

basic.forever(function () {
    testDistance = a4MicroSystemShiFuMi.ultrasonicDistanceCm()
    testHandDetected = a4MicroSystemShiFuMi.handDetected(12)

    if (testHandDetected) {
        basic.showNumber(testDistance)
    }

    basic.pause(50)
})
