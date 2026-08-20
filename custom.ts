//% weight=100 color=#007BFF icon="\uf074" block="A4 microSySTEM ShiFuMi"
//% groups='["Disc", "Ultrasonic sensor", "Disc backlight", "LCD"]'
namespace a4MicroSystemShiFuMi {
    const dfrAddress = 0x33
    const servoRegister = 0x18
    const ultrasonicPin = DigitalPin.P2
    const discBacklightPin = DigitalPin.P0
    const lcdAddress = 0x3E

    let dfrInitialized = false
    let lcdInitialized = false
    let discBacklightBrightness = 80
    let discBacklightRed = 0
    let discBacklightGreen = 0
    let discBacklightBlue = 0

    export enum ShiFuMiColor {
        //% block="red"
        Red,
        //% block="green"
        Green,
        //% block="blue"
        Blue,
        //% block="yellow"
        Yellow,
        //% block="cyan"
        Cyan,
        //% block="magenta"
        Magenta,
        //% block="white"
        White,
        //% block="orange"
        Orange,
        //% block="purple"
        Purple,
        //% block="off"
        Off
    }

    function initDfr(): void {
        if (!dfrInitialized) {
            dfrInitialized = true
            basic.pause(100)
        }
    }

    function writeDfrRegister(registerAddress: number, data: Buffer): void {
        const buffer = pins.createBuffer(data.length + 1)
        buffer[0] = registerAddress

        for (let index = 0; index < data.length; index++) {
            buffer[index + 1] = data[index]
        }

        pins.i2cWriteBuffer(dfrAddress, buffer)
    }

    function lcdCommand(command: number): void {
        const buffer = pins.createBuffer(2)
        buffer[0] = 0x80
        buffer[1] = command
        pins.i2cWriteBuffer(lcdAddress, buffer)
        basic.pause(2)
    }

    function lcdData(data: number): void {
        const buffer = pins.createBuffer(2)
        buffer[0] = 0x40
        buffer[1] = data
        pins.i2cWriteBuffer(lcdAddress, buffer)
    }

    function ensureLcd(): void {
        if (!lcdInitialized) {
            lcdInit()
        }
    }

    function showDiscBacklight(): void {
        const buffer = pins.createBuffer(3)

        // WS2812 uses GRB byte order.
        buffer[0] = Math.idiv(discBacklightGreen * discBacklightBrightness, 255)
        buffer[1] = Math.idiv(discBacklightRed * discBacklightBrightness, 255)
        buffer[2] = Math.idiv(discBacklightBlue * discBacklightBrightness, 255)
        light.sendWS2812Buffer(buffer, discBacklightPin)
    }

    function colorToRgb(color: ShiFuMiColor): number[] {
        switch (color) {
            case ShiFuMiColor.Red: return [255, 0, 0]
            case ShiFuMiColor.Green: return [0, 255, 0]
            case ShiFuMiColor.Blue: return [0, 0, 255]
            case ShiFuMiColor.Yellow: return [255, 255, 0]
            case ShiFuMiColor.Cyan: return [0, 255, 255]
            case ShiFuMiColor.Magenta: return [255, 0, 255]
            case ShiFuMiColor.White: return [255, 255, 255]
            case ShiFuMiColor.Orange: return [255, 80, 0]
            case ShiFuMiColor.Purple: return [120, 0, 255]
            case ShiFuMiColor.Off:
            default: return [0, 0, 0]
        }
    }

    /**
     * Sets the angle of the disc servomotor connected to S0.
     * @param angle angle in degrees from 0 to 180, eg: 90
     */
    //% blockId=a4_shifumi_disc_servo_angle
    //% block="set disc servo angle to %angle °"
    //% angle.min=0 angle.max=180 angle.defl=90
    //% weight=100
    //% group="Disc"
    export function setDiscServoAngle(angle: number): void {
        initDfr()

        angle = Math.clamp(0, 180, angle)
        const pulse = 500 + angle * 11
        const buffer = pins.createBuffer(2)

        buffer[0] = (pulse >> 8) & 0xFF
        buffer[1] = pulse & 0xFF
        writeDfrRegister(servoRegister, buffer)
    }

    /**
     * Reads the distance measured by the ultrasonic sensor on P2.
     * Returns -1 when no echo is received.
     */
    //% blockId=a4_shifumi_ultrasonic_distance
    //% block="ultrasonic distance (cm)"
    //% weight=100
    //% group="Ultrasonic sensor"
    export function ultrasonicDistanceCm(): number {
        pins.setPull(ultrasonicPin, PinPullMode.PullNone)
        pins.digitalWritePin(ultrasonicPin, 0)
        control.waitMicros(2)
        pins.digitalWritePin(ultrasonicPin, 1)
        control.waitMicros(10)
        pins.digitalWritePin(ultrasonicPin, 0)

        const duration = pins.pulseIn(ultrasonicPin, PulseValue.High, 30000)

        if (duration == 0) return -1
        return Math.round(duration / 58)
    }

    /**
     * Returns true when a hand is detected below the selected distance.
     * @param distance detection threshold in centimetres, eg: 12
     */
    //% blockId=a4_shifumi_hand_detected
    //% block="hand detected under %distance cm"
    //% distance.min=1 distance.max=100 distance.defl=12
    //% weight=90
    //% group="Ultrasonic sensor"
    export function handDetected(distance: number): boolean {
        const measuredDistance = ultrasonicDistanceCm()
        return measuredDistance > 0 && measuredDistance <= distance
    }

    /**
     * Sets the brightness of the RGB backlight located below the disc.
     * @param brightness brightness from 0 to 100 percent, eg: 30
     */
    //% blockId=a4_shifumi_disc_backlight_brightness
    //% block="set disc backlight brightness to %brightness \\%"
    //% brightness.min=0 brightness.max=100 brightness.defl=30
    //% weight=100
    //% group="Disc backlight"
    export function setDiscBacklightBrightness(brightness: number): void {
        brightness = Math.clamp(0, 100, brightness)
        discBacklightBrightness = Math.map(brightness, 0, 100, 0, 255)
        showDiscBacklight()
    }

    /**
     * Sets the RGB backlight located below the disc to a predefined color.
     * @param color color used by the disc backlight
     */
    //% blockId=a4_shifumi_disc_backlight_color
    //% block="set disc backlight to %color"
    //% weight=90
    //% group="Disc backlight"
    export function setDiscBacklightColor(color: ShiFuMiColor): void {
        const rgb = colorToRgb(color)
        setDiscBacklightRgb(rgb[0], rgb[1], rgb[2])
    }

    /**
     * Sets a custom RGB color for the backlight located below the disc.
     * @param red red channel value from 0 to 255, eg: 255
     * @param green green channel value from 0 to 255, eg: 100
     * @param blue blue channel value from 0 to 255, eg: 0
     */
    //% blockId=a4_shifumi_disc_backlight_rgb
    //% block="set disc backlight red %red green %green blue %blue"
    //% red.min=0 red.max=255 red.defl=255
    //% green.min=0 green.max=255 green.defl=100
    //% blue.min=0 blue.max=255 blue.defl=0
    //% inlineInputMode=inline
    //% weight=80
    //% group="Disc backlight"
    export function setDiscBacklightRgb(red: number, green: number, blue: number): void {
        red = Math.clamp(0, 255, red)
        green = Math.clamp(0, 255, green)
        blue = Math.clamp(0, 255, blue)
        discBacklightRed = red
        discBacklightGreen = green
        discBacklightBlue = blue
        showDiscBacklight()
    }

    /**
     * Turns off the RGB backlight located below the disc.
     */
    //% blockId=a4_shifumi_disc_backlight_off
    //% block="turn disc backlight off"
    //% weight=70
    //% group="Disc backlight"
    export function discBacklightOff(): void {
        setDiscBacklightRgb(0, 0, 0)
    }

    /**
     * Initializes the Grove LCD screen.
     */
    //% blockId=a4_shifumi_lcd_init
    //% block="initialize LCD"
    //% weight=100
    //% group="LCD"
    export function lcdInit(): void {
        basic.pause(50)
        lcdCommand(0x38)
        basic.pause(5)
        lcdCommand(0x39)
        basic.pause(5)
        lcdCommand(0x14)
        lcdCommand(0x70)
        lcdCommand(0x56)
        lcdCommand(0x6C)
        basic.pause(200)
        lcdCommand(0x38)
        lcdCommand(0x0C)
        lcdCommand(0x01)
        basic.pause(10)

        lcdInitialized = true
    }

    /**
     * Clears the LCD screen.
     */
    //% blockId=a4_shifumi_lcd_clear
    //% block="clear LCD"
    //% weight=90
    //% group="LCD"
    export function lcdClear(): void {
        ensureLcd()
        lcdCommand(0x01)
        basic.pause(10)
    }

    /**
     * Displays text on one line of the LCD screen.
     * Text longer than 16 characters is truncated.
     * @param text text to display, eg: "READY"
     * @param line line number from 1 to 2, eg: 1
     */
    //% blockId=a4_shifumi_lcd_text_line
    //% block="LCD show %text on line %line"
    //% text.defl="READY"
    //% line.min=1 line.max=2 line.defl=1
    //% weight=80
    //% group="LCD"
    export function lcdShowTextLine(text: string, line: number): void {
        ensureLcd()
        line = Math.clamp(1, 2, line)
        lcdCommand(0x80 | (line == 2 ? 0x40 : 0x00))

        for (let index = 0; index < 16; index++) {
            lcdData(index < text.length ? text.charCodeAt(index) : 32)
        }
    }

    /**
     * Displays a number on one line of the LCD screen.
     * @param value number to display, eg: 0
     * @param line line number from 1 to 2, eg: 2
     */
    //% blockId=a4_shifumi_lcd_number_line
    //% block="LCD show number %value on line %line"
    //% line.min=1 line.max=2 line.defl=2
    //% weight=70
    //% group="LCD"
    export function lcdShowNumberLine(value: number, line: number): void {
        lcdShowTextLine("" + value, line)
    }

}
