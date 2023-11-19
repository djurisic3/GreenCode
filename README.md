# GreenCode - Visual Studio Code Extension

GreenCode is a powerful Visual Studio Code extension that enhances your coding efficiency and promotes eco-friendly programming practices. It provides real-time insights into your code, highlighting opportunities for optimization and helping you write cleaner, more efficient code. Embrace cleaner coding practices that not only boost performance but also contribute to a greener planet.

## Features

- **Efficient Code Analysis**: Scans SQL queries and other code sections for optimization opportunities.
- **Severity Indicators**: Highlights code with potential issues using color-coded severity levels.
  - **High Severity (Red)**: Immediate replacement opportunities without functional compromise.
  - **Medium Severity (Yellow)**: Suggested optimizations that might require careful consideration.
- **One-Time Information Messages**: Displays the number of high and medium severity issues upon activation, and also upon deactivation and reactivation.
- **SQL File Support**: When working with SQL files, prompts for login data for database-specific analysis.

### Version 0.1.0 - New Features

#### Interactive Severity Navigation

GreenCode now offers an enhanced interactive experience with its severity navigation feature. This feature significantly improves the way developers interact with the identified issues in their code.

##### Status Bar Integration

- The extension displays the count of high and medium severity issues separately in the status bar.
- Each count is interactive and clickable, allowing developers to swiftly navigate through the issues of the respective severity.

##### Looped Navigation

- Once you reach the end of the list of issues in a specific severity, the navigation loops back to the first issue.
- This ensures a continuous and seamless review cycle, enabling developers to address all issues without manual resetting.

##### Dynamic Issue Count

- As you navigate through and address these issues, GreenCode dynamically updates the count of high and medium severity spots.
- This provides real-time feedback on your progress towards optimizing your code, making the process more efficient and effective.

These enhancements are designed to streamline the optimization process, making it more efficient and user-friendly. By focusing on high-impact changes first and then addressing medium severity issues, developers can systematically improve their code’s performance and contribute to more sustainable software development practices.


## Extension Commands

GreenCode introduces several commands with convenient keybindings:

- `greencode.markDirtyCode`: Activates the extension. Keybinding: `Shift + Ctrl + Alt + F`
- `greencode.deactivateMarkDirtyCode`: Deactivates the extension. Keybinding: `Shift + Ctrl + Alt + D`
- `greencode.cleanMarkedCode`: Replaces identified issues with optimized code. Keybinding: `Ctrl + Space`

## Getting Started

1. **Install** the extension from the Visual Studio Code Marketplace.
2. **Activate** GreenCode using `Shift + Ctrl + Alt + F`.
3. For **SQL files**, enter your login details as prompted.
4. **Review** the highlighted issues and consider the suggested optimizations.
5. **Deactivate** the extension with `Shift + Ctrl + Alt + D` if needed.
6. **Apply** optimizations to enhance your code's efficiency and eco-friendliness.

## Contributing

Your contributions to improve GreenCode are highly appreciated. Whether it's bug reporting, feature suggestion, or code contribution, feel free to open an issue or submit a pull request on our GitHub repository.

## License

GreenCode is made available under the [MIT License](LICENSE).

## About

GreenCode is developed with the aim of helping programmers write more efficient and environmentally responsible code, contributing to a greener and more sustainable future in software development.

---

For more information, visit [our GitHub repository](https://github.com/your-github-username/greencode).
