package com.nguyenhoanglong.util;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class ColorPaletteTest {

    @Test
    void khopChinhXac_traDungMaMau() {
        assertThat(ColorPalette.fromHex("#ffffff")).contains("white");
        assertThat(ColorPalette.fromHex("#111111")).contains("black");
        assertThat(ColorPalette.fromHex("#f9a8d4")).contains("pink");
        assertThat(ColorPalette.fromHex("#3b5f8a")).contains("denim");
    }

    @Test
    void khongPhanBietHoaThuong() {
        assertThat(ColorPalette.fromHex("#FFFFFF")).contains("white");
        assertThat(ColorPalette.fromHex("#FaCc15")).contains("yellow");
    }

    @Test
    void hexGanMotMauChuan_ganVaoMauDo() {
        // #FEFEFE gan sat #ffffff (white), phai gop chung mot ma mau.
        assertThat(ColorPalette.fromHex("#fefefe")).contains("white");
        // #100f0f gan sat #111111 (black).
        assertThat(ColorPalette.fromHex("#100f0f")).contains("black");
    }

    @Test
    void hexQuaXaMoiMauChuan_traVeRong() {
        // Mot mau tim sang khong gan mau chuan nao trong bang -> khong doan bua.
        Optional<String> result = ColorPalette.fromHex("#a020f0");
        assertThat(result).isEmpty();
    }

    @Test
    void hexKhongHopLe_traVeRong() {
        assertThat(ColorPalette.fromHex(null)).isEmpty();
        assertThat(ColorPalette.fromHex("")).isEmpty();
        assertThat(ColorPalette.fromHex("khong-phai-hex")).isEmpty();
        assertThat(ColorPalette.fromHex("#fff")).isEmpty(); // chi ho tro dang 6 hex digit
    }
}
