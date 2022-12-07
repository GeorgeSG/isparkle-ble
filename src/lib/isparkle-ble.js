const BleUart = require("./ble-uart");

const VALID_TYPES = ["PT", "PW", "SP", "TM"];

class iSparkleBle extends BleUart {
  constructor() {
    super();
    this.count = 0;
    this.debug = false;
  }

  getCmdString(value) {
    // Default type prefix
    let typeString = "PT";

    // Check if type prefix is set
    if (VALID_TYPES.indexOf(value.slice(0, 2)) > -1) {
      typeString = "";
    }

    // Prefix 2-digit count
    let count = this.count;
    if (this.count < 10) {
      count = `0${count}`;
    } else if (this.count === 99) {
      count = "00";
    }

    // Remove spaces from value
    const valueString = `${value.replace(/\s+/g, "")}`;

    return `${count}${typeString}${valueString}`;
  }

  sendCmd(commands) {
    // single command
    if (commands.length === 1) {
      // Handle 'on' or 'off' text input
      if (commands[0] === "off" || commands[0] === "on") {
        this.writeString(this.getCmdString(commands[0] === "off" ? "PW0" : "PW1"));

        // Activate lights after turning on
        if (commands[0] === "on") {
          this.writeString(this.getCmdString("1120005000050"));
        }

        // this.sendClearCmd()
        return;
      }

      this.writeString(this.getCmdString(commands[0]));
      this.sendClearCmd();
      return;
    }

    // multiple commands
    commands.forEach((command, i) => {
      this.writeString(this.getCmdString(command));

      // clear at end
      if (i === commands.length - 1) {
        this.sendClearCmd();
      }
    });
  }

  setFade(color = "white", fadeInTime = 0, fadeOutTime = 0) {
    let colorCmnd;
    if (color === "mix") colorCmnd = "10";
    else if (color === "white") colorCmnd = "11";
    else throw new Error(`Invalid color ${color}`);

    const fnCmnd = "2";
    const fade1 = fadeInTime.toString().padStart(3, "0");
    const fade2 = fadeOutTime.toString().padStart(3, "0");

    console.log("setting fade", color, fade1, fade2);

    const cmnd = `${colorCmnd}${fnCmnd}10${fade1}10${fade2}`;
    this.sendCmd([cmnd]);
  }

  setState(
    color = "white",
    fn = "solid",
    brightness1 = "00",
    timing1 = "000",
    brightness2 = "10",
    timing2 = "000"
  ) {
    let colorCmnd;
    if (color === "mix") colorCmnd = "10";
    else if (color === "white") colorCmnd = "11";
    else throw new Error(`Invalid color ${color}`);

    let fnCmnd;
    if (fn === "solid") fnCmnd = "1";
    else if (fn === "fade") fnCmnd = "2";
    else throw new Error(`Invalid fn ${fn}`);

    const b1 = brightness1.toString().padStart(2, "0");
    const b2 = brightness2.toString().padStart(2, "0");
    const t1 = timing1.toString().padStart(3, "0");
    const t2 = timing2.toString().padStart(3, "0");

    const cmnd = `${colorCmnd}${fnCmnd}${b1}${t1}${b2}${t2}`;
    this.sendCmd([cmnd]);
  }

  sendClearCmd() {
    this.writeString(this.getCmdString("0000000000000"));
  }

  writeString(cmdString) {
    if (this.debug) {
      console.log(`write: ${cmdString}`);
    }
    this.write(cmdString);
    this.count++;
  }
}

module.exports = iSparkleBle;
